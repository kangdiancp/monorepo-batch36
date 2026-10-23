import { Queue } from 'bullmq';
import { STATIONS, connection, type ItemJob, type StationCode } from './config';
import { pool } from './db';
import { hitungItemPerStatus, itemGagal, pesananTerbaru } from './repo';

// ============================================================================
// MONITORING: dua sudut pandang — Postgres (apa yang BISNIS ketahui) dan
// BullMQ (apa yang ADA di antrean).
//
//   npx tsx status.ts            # sekali tampil
//   npx tsx status.ts --watch    # refresh tiap 2 detik
// ============================================================================

const codes = Object.keys(STATIONS) as StationCode[];
const watch = process.argv.includes('--watch');

const queues = Object.fromEntries(
  codes.map((c) => [c, new Queue<ItemJob>(STATIONS[c].queue, { connection })]),
) as Record<StationCode, Queue<ItemJob>>;

async function tampil(): Promise<void> {
  const [dbCounts, orders, gagal] = await Promise.all([hitungItemPerStatus(), pesananTerbaru(10), itemGagal(20)]);

  const antrean: Record<string, Record<string, number>> = {};
  for (const c of codes) {
    antrean[STATIONS[c].label] = await queues[c].getJobCounts('waiting', 'prioritized', 'delayed', 'active', 'completed', 'failed');
  }

  if (watch) console.clear();
  console.log(`📊 Status — ${new Date().toLocaleTimeString()}`);

  console.log('\n🐘 Postgres: item per status');
  console.table(Object.fromEntries(codes.map((c) => [STATIONS[c].label, dbCounts[c]])));

  console.log('⚡ BullMQ (Redis): job per state');
  console.table(antrean);

  // Cek konsistensi kasar: item "dalam proses" di DB harus ~sama dengan job hidup di Redis.
  for (const c of codes) {
    const d = dbCounts[c]!;
    const q = antrean[STATIONS[c].label]!;
    const diDb = (d.QUEUED ?? 0) + (d.COOKING ?? 0) + (d.RETRYING ?? 0);
    const diRedis = (q.waiting ?? 0) + (q.prioritized ?? 0) + (q.delayed ?? 0) + (q.active ?? 0);
    if (diDb !== diRedis) {
      console.log(`⚠️  ${STATIONS[c].label}: Postgres ${diDb} item dalam proses vs Redis ${diRedis} job hidup (bisa sedang transisi; cek lagi)`);
    }
  }

  console.log('\n🧾 Pesanan terbaru');
  console.table(orders);

  if (gagal.length > 0) {
    console.log('💀 Item gagal permanen (dari Postgres)');
    console.table(gagal);
  }
}

async function tutup(): Promise<void> {
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await pool.end();
}

async function main(): Promise<void> {
  await tampil();
  if (!watch) return tutup();

  const timer = setInterval(() => void tampil().catch((e) => console.error(e)), 2000);
  process.on('SIGINT', () => {
    clearInterval(timer);
    void tutup().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('Gagal membaca status:', err);
  process.exit(1);
});
