import { COMPANIES, kafka, type CompanyCode } from './kafka-config';
import { pool } from '../db';

// Cara pake:
//   COMPANY=abc npx tsx consumer.ts     -> HRD PT. ABC (group hrd-abc)
//   COMPANY=xyz npx tsx consumer.ts     -> HRD PT. XYZ (group hrd-xyz)
//


function resolveCompany(): CompanyCode {
  const code = (process.env.COMPANY ?? process.argv[2] ?? '').toLowerCase();
  if (code !== 'abc' && code !== 'xyz') {
    console.error('Tentukan perusahaan: COMPANY=abc atau COMPANY=xyz');
    process.exit(1);
  }
  return code;
}

interface SuratEvent {
  event_id: string;
  surat_id: string;
  applicant_id: string;
  company: string;
  sent_at: string;
}

async function main(): Promise<void> {
  const code = resolveCompany();
  const { name, topic, groupId } = COMPANIES[code];

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();

  // autoCommit dimatikan:source offset = tabel consumer_offsets, bukan __consumer_offsets Kafka.
  await consumer.subscribe({ topic, fromBeginning: true }); // dipakai hanya utk partisi yg belum tercatat

  // Tiap (re)join group -> seek ke last_offset + 1 sesuai isi DB.
  consumer.on(consumer.events.GROUP_JOIN, async ({ payload }) => {
    const partitions = payload.memberAssignment[topic] ?? [];
    if (partitions.length === 0) return;

    const { rows } = await pool.query(
      `SELECT partition_no, last_offset FROM kafka.consumer_offsets
       WHERE consumer_group = $1 AND topic = $2 AND partition_no = ANY($3::int[])`,
      [groupId, topic, partitions],
    );
    for (const r of rows) {
      const next = String(Number(r.last_offset) + 1);
      consumer.seek({ topic, partition: r.partition_no, offset: next });
      console.log(`[seek] Partition-${r.partition_no} -> offset ${next} (dari DB)`);
    }
  });

  console.log(`HRD ${name} siap | topic=${topic} | group=${groupId}\n`);

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;
      const surat = JSON.parse(message.value.toString()) as SuratEvent;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const ins = await client.query(
          `INSERT INTO kafka.surat_diterima
             (event_id, surat_id, applicant_id, company_code, consumer_group,
              topic, partition_no, kafka_offset, payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (consumer_group, event_id) DO NOTHING`,
          [
            surat.event_id, surat.surat_id, surat.applicant_id, code, groupId,
            topic, partition, message.offset, JSON.stringify(surat),
          ],
        );

        await client.query(
          `INSERT INTO kafka.consumer_offsets (consumer_group, topic, partition_no, last_offset)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (consumer_group, topic, partition_no) DO UPDATE
             SET last_offset = GREATEST(consumer_offsets.last_offset, EXCLUDED.last_offset),
                 updated_at  = CURRENT_TIMESTAMP`,
          [groupId, topic, partition, message.offset],
        );

        await client.query('COMMIT');

        console.log(
          `[${topic}] Partition-${partition} | Offset ${message.offset} -> Surat ${surat.surat_id} dari ${surat.applicant_id}` +
            (ins.rowCount === 0 ? ' (duplikat, di-skip)' : ''),
        );
      } catch (err) {
        await client.query('ROLLBACK');
        throw err; // kafkajs akan retry pesan yang sama
      } finally {
        client.release();
      }
    },
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} diterima, consumer berhenti...`);
    await consumer.disconnect();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Consumer gagal jalan:', err);
  process.exit(1);
});