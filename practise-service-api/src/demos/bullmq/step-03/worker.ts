import { Worker, Job } from "bullmq";
import { connection, QUEUE_NAME, OrderData } from "./bullmq-config";

async function runWorker() {
  console.log("─".repeat(50));
  console.log("  Restoran — Worker (Koki)");
  console.log("─".repeat(50));
  console.log(`Redis: ${connection.host}:${connection.port}`);
  console.log("Proses memasak dimulai...\n");

  const worker = new Worker<OrderData>(
    QUEUE_NAME,
    async (job: Job<OrderData>) => {
      const { orderId, item, customerType } = job.data;
      const p = job.opts.priority ?? 0;

      console.log(
        `[Masak]  #${orderId.padEnd(2)} ${item.padEnd(18)} | ${customerType.padEnd(7)} (priority ${p})`
      );

      // simulasi waktu masak 1.5 detik
      await new Promise((r) => setTimeout(r, 1500));

      console.log(`[Selesai] #${orderId.padEnd(2)} ${item}`);
    },
    {
      connection,
      concurrency: 1, // 1 koki
    }
  );

  worker.on("completed", (job) => {
    console.log(`{Job Completed}: ${job.id} selesai\n`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Job Failed]: ${job?.id} gagal: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err.message);
  });
}

runWorker().catch((err) => {
  console.error("\nError di Worker:", err.message || err);
  if (String(err.message || err).includes("ECONNREFUSED")) {
    console.error(`Gagal koneksi ke redis di ${connection.host}:${connection.port}. Pastikan Redis sudah berjalan.`);
  }
  process.exit(1);
});