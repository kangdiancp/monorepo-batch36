import { Worker } from "bullmq";
import { connection, QUEUE_NAME } from "./bullmq-config";

async function runWorker() {
    console.log("─".repeat(50));
    console.log("  Restoran — Worker (Koki)");
    console.log("─".repeat(50));
    console.log(`Redis: ${connection.host}:${connection.port}`);
    console.log("Siap di dapur dan menunggu pesanan masuk...\n");

    const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            const p = job.opts.priority ?? 0;
            const isVip = p > 0 ? '[PRIORITAS TINGGI]' : '[REGULER]';

            console.log(`[Masak] ${isVip} #${job.data.orderId} ${job.data.item} (priority ${p})`);
            
            // Simulasi waktu memasak selama 2 detik
            await new Promise((resolve) => setTimeout(resolve, 2000));
            
            return 'Sukses';
        },
        {
            connection,
            concurrency: 1,
        }
    );

    worker.on('completed', (job) => {
        console.log(`--- [Info Queue] Job ${job.id} (${job.data.item}) telah selesai diproses dan dibersihkan.\n`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[Job Failed]: ${job?.id} gagal: ${err.message}`);
    });

    worker.on("error", (err) => {
        console.error("Worker error:", err.message);
    });
}

runWorker().catch((err) => {
    console.error('Error occurred in Worker: ', err);
    process.exit(1);
});