import { Partitioners } from 'kafkajs';
import { kafka } from './kafka-config';
import { pool } from './db';

// Relay: baca baris PENDING di surat_events_outbox -> publish ke Kafka -> lalu update jadi PUBLISHED.
// FOR UPDATE SKIP LOCKED -> aman dijalankan >1 instance.

const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
const MAX_RETRY = Number(process.env.OUTBOX_MAX_RETRY ?? 5);

const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
let stopRequested = false;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function publishBatch(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT outbox_id, event_id, applicant_id, topic, payload, retry_count
       FROM kafka.surat_events_outbox
       WHERE status = 'PENDING'
       ORDER BY outbox_id ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE],
    );

    for (const row of rows) {
      try {
        // producer send message to kafka broker
        const [meta] = await producer.send({
          topic: row.topic,
          messages: [
            {
              key: row.applicant_id, // key sama -> partisi sama -> urutan terjaga
              value: JSON.stringify({ event_id: row.event_id, ...row.payload }),
            },
          ],
        });
        await client.query(
          `UPDATE kafka.surat_events_outbox SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
           WHERE outbox_id = $1`,
          [row.outbox_id],
        );
        console.log(
          `[publisher] outbox #${row.outbox_id} -> ${row.topic} | Partition-${meta?.partition} | Offset ${meta?.baseOffset}`,
        );
      } catch (err) {
        const next = row.retry_count + 1;
        await client.query(
          `UPDATE kafka.surat_events_outbox
           SET retry_count = $2, status = $3, error_message = $4
           WHERE outbox_id = $1`,
          [row.outbox_id, next, next >= MAX_RETRY ? 'FAILED' : 'PENDING', (err as Error).message],
        );
        console.error(`[publisher] gagal outbox #${row.outbox_id} (${next}/${MAX_RETRY}):`, err);
      }
    }

    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await producer.connect();
  console.log(`[publisher] jalan, polling tiap ${POLL_INTERVAL_MS}ms`);

  while (!stopRequested) {
    try {
      const n = await publishBatch();
      if (n === 0) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      console.error('[publisher] error di poll loop:', err);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await producer.disconnect();
  await pool.end();
}

const shutdown = (sig: string) => {
  console.log(`\n${sig} diterima, publisher berhenti...`);
  stopRequested = true;
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error('Publisher gagal jalan:', err);
  process.exit(1);
});