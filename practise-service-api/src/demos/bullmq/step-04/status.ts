import { Queue } from 'bullmq';
import { STATIONS, connection, type ItemJob, type StationCode } from './config';
import { pool } from './db';
import { countItemPerStatus, itemFailed, latestOrder } from './repo';


// Monitor di sisi postgres dan bullmq (apa yg ada di antrean), running command berikut : 
//   npx tsx status.ts            # sekali display
//   npx tsx status.ts --watch    # refresh tiap 2 detik


const codes = Object.keys(STATIONS) as StationCode[];
const watch = process.argv.includes('--watch');

const queues = Object.fromEntries(
  codes.map((c) => [c, new Queue<ItemJob>(STATIONS[c].queue, { connection })]),
) as Record<StationCode, Queue<ItemJob>>;

async function display(): Promise<void> {
  const [dbCounts, orders, gagal] = await Promise.all([countItemPerStatus(), latestOrder(10), itemFailed(20)]);

  const antrean: Record<string, Record<string, number>> = {};
  for (const c of codes) {
    antrean[STATIONS[c].label] = await queues[c].getJobCounts('waiting', 'prioritized', 'delayed', 'active', 'completed', 'failed');
  }

  if (watch) console.clear();
  console.log(`Status — ${new Date().toLocaleTimeString()}`);

  console.log('\nPostgres: item per status');
  console.table(Object.fromEntries(codes.map((c) => [STATIONS[c].label, dbCounts[c]])));

  console.log('BullMQ (Redis): job per state');
  console.table(antrean);

  // Cek konsistensi kasar: item "dalam proses" di DB harus ~sama dengan job hidup di Redis.
  for (const c of codes) {
    const d = dbCounts[c]!;
    const q = antrean[STATIONS[c].label]!;
    const diDb = (d.QUEUED ?? 0) + (d.COOKING ?? 0) + (d.RETRYING ?? 0);
    const diRedis = (q.waiting ?? 0) + (q.prioritized ?? 0) + (q.delayed ?? 0) + (q.active ?? 0);
    if (diDb !== diRedis) {
      console.log(`${STATIONS[c].label}: Postgres ${diDb} item dalam proses vs Redis ${diRedis} job hidup (bisa sedang transisi; cek lagi)`);
    }
  }

  console.log('\nPesanan terbaru');
  console.table(orders);

  if (gagal.length > 0) {
    console.log('Item gagal permanen (dari Postgres)');
    console.table(gagal);
  }
}

async function close(): Promise<void> {
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await pool.end();
}

async function main(): Promise<void> {
  await display();
  if (!watch) return close();

  const timer = setInterval(() => void display().catch((e) => console.error(e)), 2000);
  process.on('SIGINT', () => {
    clearInterval(timer);
    void close().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('Gagal membaca status:', err);
  process.exit(1);
});
