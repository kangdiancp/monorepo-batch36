import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { disconnectKafkaProducer, getKafkaProducer } from '../../common/kafka/producer';
import { TOPIC, type EmployeeEventType, type HrEmployeeEvent } from './kafka-config';


const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
const MAX_RETRY = Number(process.env.OUTBOX_MAX_RETRY ?? 5);
const LOG = '[hr-outbox]';

interface OutboxRow {
  outbox_id: string; 
  aggregate_id: number;
  event_type: EmployeeEventType;
  payload: HrEmployeeEvent['data'];
  retry_count: number;
  created_at: Date;
}

let stopRequested = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishBatch(): Promise<{ published: number; hadFailure: boolean }> {
  const producer = await getKafkaProducer();

  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      SELECT outbox_id, aggregate_id, event_type, payload, retry_count, created_at
      FROM hr.employee_events_outbox
      WHERE status = 'PENDING'
      ORDER BY outbox_id ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `);
    const rows = result.rows as unknown as OutboxRow[];

    let published = 0;

    for (const row of rows) {
      const event: HrEmployeeEvent = {
        event_type: row.event_type,
        employee_id: row.aggregate_id,
        occurred_at: new Date(row.created_at).toISOString(),
        data: row.event_type === 'employee.terminated' ? null : row.payload,
      };

      try {
        await producer.send({
          topic: TOPIC,
          messages: [{ key: String(row.aggregate_id), value: JSON.stringify(event) }],
        });

        await tx.execute(sql`
          UPDATE hr.employee_events_outbox
          SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
          WHERE outbox_id = ${row.outbox_id}
        `);
        published++;
        console.log(`${LOG} published #${row.outbox_id} ${row.event_type} employee=${row.aggregate_id}`);
      } catch (err) {
        const nextRetry = row.retry_count + 1;
        const failed = nextRetry >= MAX_RETRY;
        console.error(`${LOG} gagal publish #${row.outbox_id} (attempt ${nextRetry}/${MAX_RETRY}):`, err);

        await tx.execute(sql`
          UPDATE hr.employee_events_outbox
          SET retry_count = ${nextRetry},
              status = ${failed ? 'FAILED' : 'PENDING'},
              error_message = ${(err as Error).message}
          WHERE outbox_id = ${row.outbox_id}
        `);
        return { published, hadFailure: true }; 
      }
    }

    return { published, hadFailure: false };
  });
}

export async function runOutboxPublisher(): Promise<void> {
  console.log(`${LOG} started, polling tiap ${POLL_INTERVAL_MS}ms, batch ${BATCH_SIZE}, max retry ${MAX_RETRY}`);

  while (!stopRequested) {
    try {
      const { published, hadFailure } = await publishBatch();
      if (published === 0 || hadFailure) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      console.error(`${LOG} error di poll loop:`, err);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await disconnectKafkaProducer();
  console.log(`${LOG} stopped.`);
}

export function stopOutboxPublisher(): void {
  stopRequested = true;
}

if (require.main === module) {
  const onSignal = (signal: string) => {
    console.log(`${LOG} ${signal} diterima, berhenti setelah batch berjalan selesai...`);
    stopOutboxPublisher();
  };
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));

  runOutboxPublisher()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`${LOG} fatal:`, err);
      process.exit(1);
    });
}