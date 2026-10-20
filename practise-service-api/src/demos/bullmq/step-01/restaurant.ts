import { Queue, Worker } from "bullmq";


//1. konfig koneksi redis docker
const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379
};

//2. set nama anteran
const QUEUE_NAME = 'order-food';

//3. create function main
async function main() {
    console.log("─".repeat(50));
    console.log("  Restoran — Antrian BullMQ dengan Priority");
    console.log("─".repeat(50));
    console.log(`Redis: ${connection.host}:${connection.port}`);
    console.log("");

    // Bersihkan antrian lama (opsional, biar demo bersih)
    const orderQueue = new Queue(QUEUE_NAME, { connection });
    await orderQueue.obliterate({ force: true });
    console.log("Clear Antrian\n");


    //1. koneksi to worker
    const worker = new Worker(QUEUE_NAME, async (job) => {
        const p = job.opts.priority ?? 0;

        console.log(`[Masak]  #${job.data.orderId} ${job.data.item}  (priority ${p})`);
        //kasih delay 2 second
        await new Promise((resolve) => setTimeout(resolve, 2000));

        //console.log(`[Selesai] ${job.data.item}`)
    },

        {
            connection,
            concurrency: 1

        }
    );


    //2. call event listener saat worker memproses order
    worker.on('completed', (job) => {
        console.log(`--- [Info Queue] Job ${job.id} telah selesai diproses dan dibersihkan.\n`);
    });


    worker.on("failed", (job, err) => {
        console.error(`[Job Failed]: ${job?.id} gagal: ${err.message}`);
    });


    worker.on("error", (err) => {
        console.error("Worker error:", err.message);
    });


    // PART 2 : CREATE QUEUEU
    //4.1 kirim order
    await orderQueue.add('order-food', {
        orderId: '1',
        item: 'Nasi Goreng'
    }, { priority: 10 });

    await orderQueue.add('order-food', {
        orderId: '2',
        item: 'Pisang Goreng'
    }, { priority: 10 });

    await orderQueue.add('order-food', {
        orderId: '3',
        item: 'Juice Mangga'
    }, { priority: 0 });

    await orderQueue.add('order-food', {
        orderId: '4',
        item: 'Hot Milk'
    }, { priority: 10 });

    await orderQueue.add('order-food', {
        orderId: '5',
        item: 'Juice Jeruk'
    }, { priority: 0 });

    console.log('Semua pesanan berhasil dikirim ke sistem antrean BullMQ!\n');



    // Tunggu sampai semua job selesai
    await new Promise<void>((resolve) => {
        let done = 0;
        const total = 5;

        worker.on("completed", () => {
            done++;
            if (done >= total) resolve();
        });

        // fallback timeout
        setTimeout(resolve, 20_000);
    });

    await worker.close();
    await orderQueue.close();

    console.log("─".repeat(50));
    console.log("  Simulation finished");
    console.log("─".repeat(50));
    process.exit(0);
}

//4. run main function
main().catch((err) => {
    console.error('Error occured: ', err)
    process.exit(1);
})
