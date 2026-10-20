import { COMPANIES, type CompanyCode } from './kafka-config';
import { pool } from './db';

// producer.ts TIDAK komunikasi ke Kafka sama sekali — cuma INSERT ke
// surat_events_outbox. Pengiriman ke Kafka dilakukan outbox-publisher.ts.
// benefitnya: "surat tercatat" jadi atomik di DB; kalau Kafka down, surat tidak hilang.

interface Surat {
  id: string;
  applicantId: string; // jadi KEY di Kafka -> surat pelamar yg sama selalu disimpan dalam partisi yg sama
  company: CompanyCode;
}

const SURAT: Surat[] = [
/*   { id: 'A', applicantId: 'pelamar-01', company: 'abc' },
  { id: 'B', applicantId: 'pelamar-01', company: 'abc' },
  { id: 'C', applicantId: 'pelamar-01', company: 'abc' },
  { id: 'D', applicantId: 'pelamar-02', company: 'abc' },
  { id: 'E', applicantId: 'pelamar-03', company: 'abc' }, */
  { id: 'AA', applicantId: 'pelamar-05', company: 'abc' },
  { id: 'BB', applicantId: 'pelamar-06', company: 'abc' },
  { id: 'CC', applicantId: 'pelamar-07', company: 'abc' },
  { id: 'DD', applicantId: 'pelamar-08', company: 'abc' },
  { id: 'EE', applicantId: 'pelamar-09', company: 'abc' },
  { id: 'FF', applicantId: 'pelamar-10', company: 'xyz' },
/*   { id: 'G', applicantId: 'pelamar-05', company: 'xyz' },
  { id: 'H', applicantId: 'pelamar-05', company: 'xyz' },
  { id: 'I', applicantId: 'pelamar-06', company: 'xyz' },
  { id: 'J', applicantId: 'pelamar-06', company: 'xyz' }, */
];

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of SURAT) {
      const { topic, name } = COMPANIES[s.company];
      const payload = {
        surat_id: s.id,
        applicant_id: s.applicantId,
        company: name,
        sent_at: new Date().toISOString(),
      };

      const { rows } = await client.query(
        `INSERT INTO kafka.surat_events_outbox (surat_id, applicant_id, company_code, topic, payload)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING outbox_id, event_id`,
        [s.id, s.applicantId, s.company, topic, JSON.stringify(payload)],
      );
      console.log(`Surat ${s.id} (${s.applicantId}) -> outbox #${rows[0].outbox_id} [${topic}]`);
    }

    await client.query('COMMIT');
    console.log(`\n${SURAT.length} surat masuk outbox (status PENDING).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Gagal insert ke outbox:', err);
  process.exit(1);
});