import { Worker } from 'bullmq';
import { MENU, STATIONS, WORKERS, connection, type ItemJob, type WorkerCode } from './config';
import { pool } from './db';
import { startRelayLoop, tutupRelay } from './outbox';
import { catatGagal, mulaiMasak, tandaiSelesai } from './repo';

// ============================================================================
// WORKERS (Koki 1, Koki 2, Barista). Data pesanan dibaca & status ditulis ke Postgres.
//
//   npx tsx worker.ts                   # semua worker + relay dalam satu proses
//   WORKER=koki-1 npx tsx worker.ts     # hanya Koki 1
//   RELAY=off npx tsx worker.ts         # tanpa relay (kalau relay dijalankan terpisah)
//
// CATATAN: job ini AT-LEAST-ONCE. Kalau worker mati SETELAH masak tapi SEBELUM
// status DONE tersimpan, job diulang dan masak dua kali. Karena itu efek samping
// di dunia nyata (kirim email, tagih kartu) harus dibuat idempotent.
// ============================================================================

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (msg: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s] ${msg}`);

function buatWorker(code: WorkerCode): Worker<ItemJob> {
  const { nama, station, concurrency } = WORKERS[code];
  const { queue, limiter, label } = STATIONS[station];

  const worker = new Worker<ItemJob>(
    queue,
    async (job) => {
      const percobaan = job.attemptsMade + 1;

      // Baca dari Postgres (sumber kebenaran) + tandai COOKING
      const item = await mulaiMasak(job.data.itemId, nama, percobaan);
      if (!item) {
        log(`⏭️  ${nama}: item ${job.data.itemId} sudah selesai/dibatalkan, job duplikat dilewati`);
        return { dilewati: true, percobaan };
      }

      log(`👨‍🍳 ${nama} memasak ${item.menu} (${item.meja}) [item ${item.item_id}] ${item.vip ? 'VIP' : 'reguler'} — percobaan ${percobaan}/${job.opts.attempts}`);

      const cookMs = MENU[item.menu]?.cookMs ?? 1500;
      for (let step = 1; step <= 4; step++) {
        await sleep(cookMs / 4);
        await job.updateProgress(step * 25);
      }

      if (item.simulasi_gagal && job.attemptsMade < item.simulasi_gagal) {
        throw new Error('masakan gosong / bahan habis'); // khusus demo
      }

      await tandaiSelesai(item.item_id); // DONE + hitung ulang status order (1 transaksi)
      return { dikerjakanOleh: nama, percobaan };
    },
    { connection, concurrency, limiter },
  );

  worker.on('completed', (job, hasil: { dilewati?: boolean; percobaan: number }) => {
    if (hasil.dilewati) return;
    const info = hasil.percobaan > 1 ? ` (setelah ${hasil.percobaan} percobaan)` : '';
    log(`✅ ${nama}: item ${job.data.itemId} siap diantar${info}`);
  });

  // 'failed' menyala di SETIAP percobaan gagal -> catat ke Postgres tiap kali
  worker.on('failed', (job, err) => {
    if (!job) return;
    const permanen = job.attemptsMade >= (job.opts.attempts ?? 1);
    log(
      permanen
        ? `💀 ${nama}: item ${job.data.itemId} GAGAL PERMANEN — ${err.message}`
        : `🔁 ${nama}: item ${job.data.itemId} gagal (${err.message}) — akan diulang`,
    );
    catatGagal(job.data.itemId, err.message, permanen, job.attemptsMade).catch((e: Error) =>
      log(`⚠️  gagal mencatat kegagalan ke Postgres: ${e.message}`),
    );
  });

  worker.on('stalled', (jobId) => log(`⚠️  ${nama}: job ${jobId} stalled, akan diambil ulang`));
  worker.on('error', (err) => console.error(`${nama} error:`, err));

  log(`🍳 ${nama} siap di ${label} | concurrency=${concurrency} | limit ${limiter.max}/${limiter.duration / 1000}s`);
  return worker;
}

function pilihWorker(): WorkerCode[] {
  const pilihan = (process.env.WORKER ?? process.argv[2] ?? 'all').toLowerCase();
  if (pilihan === 'all') return Object.keys(WORKERS) as WorkerCode[];
  if (!(pilihan in WORKERS)) {
    console.error(`Worker tidak dikenal: "${pilihan}". Pilih: ${Object.keys(WORKERS).join(', ')}, atau all`);
    process.exit(1);
  }
  return [pilihan as WorkerCode];
}

function main(): void {
  const workers = pilihWorker().map(buatWorker);

  // Jaring pengaman: antre ulang item PENDING (mis. saat Redis sempat mati waktu producer jalan)
  const hentikanRelay = process.env.RELAY === 'off' ? undefined : startRelayLoop(5000, log);

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} diterima, selesaikan masakan yang sedang jalan dulu...`);
    hentikanRelay?.();
    await Promise.all(workers.map((w) => w.close()));
    await tutupRelay();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main();
