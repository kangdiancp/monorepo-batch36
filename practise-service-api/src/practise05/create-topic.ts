import { COMPANIES, NUM_PARTITIONS, kafka } from './kafka-config';
import { pool } from '../db';

// cara running:
//   npx tsx create-topic.ts           -> buat topic kalau belum ada (aman di-run ulang)
//   npx tsx create-topic.ts --reset   -> HAPUS topic yang ada, lalu buat ulang dari nol


const RESET = process.argv.includes('--reset');
const PURGE = process.argv.includes('--purge-outbox');

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = Object.values(COMPANIES).map((c) => c.topic);

    if (RESET) {
      const existing = (await admin.listTopics()).filter((t) => topics.includes(t as any));

      if (existing.length > 0) {
        console.log('Menghapus topic:', existing);
        await admin.deleteTopics({ topics: existing, timeout: 10_000 });

        // Hapus dulu broker ASYNC — tunggu sampai benar-benar hilang,
        // kalau tidak createTopics bisa gagal ("topic is marked for deletion").
        for (let i = 0; i < 30; i++) {
          const left = (await admin.listTopics()).filter((t) => existing.includes(t));
          if (left.length === 0) break;
          if (i === 29) throw new Error(`Topic belum terhapus: ${left.join(', ')}`);
          await sleep(500);
        }
        console.log('Topic terhapus.');
      } else {
        console.log('Tidak ada topic lama yang perlu dihapus.');
      }

      // Offset di DB harus ikut di-reset karena offset topic baru mulai dari 0.
      const del = await pool.query('DELETE FROM consumer_offsets WHERE topic = ANY($1::text[])', [topics]);
      console.log(`consumer_offsets: ${del.rowCount} baris dihapus.`);

      if (PURGE) {
        await pool.query('TRUNCATE surat_diterima, surat_events_outbox RESTART IDENTITY');
        console.log('surat_diterima & surat_events_outbox dikosongkan.');
      } else {
        // Baris outbox lama yang sudah PUBLISHED tidak akan dikirim ulang. Kalau mau
        // kirim ulang, pakai --purge-outbox lalu jalankan producer lagi.
        console.log('(outbox & surat_diterima dibiarkan; pakai --purge-outbox untuk mengosongkan)');
      }
    }

    // createTopics return false kalau semua topic sudah ada -> aman di-run ulang.
    const created = await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map((topic) => ({
        topic,
        numPartitions: NUM_PARTITIONS,
        replicationFactor: 1, // 1 broker -> 1 replika
      })),
    });
    console.log(created ? 'Topic baru dibuat.' : 'Topic sudah ada, tidak ada perubahan.');

    const { topics: metadata } = await admin.fetchTopicMetadata({ topics });
    for (const t of metadata) {
      console.log(`\n${t.name}`);
      for (const p of t.partitions.sort((a, b) => a.partitionId - b.partitionId)) {
        console.log(`  Partition-${p.partitionId}  leader=broker ${p.leader}`);
      }
    }
  } finally {
    await admin.disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Gagal membuat topic:', err);
  process.exit(1);
});