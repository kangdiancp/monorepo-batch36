import { Queue } from "bullmq";
import { connection, QUEUE_NAME } from "./bullmq-config";

async function runProducer() {
    console.log("─".repeat(50));
    console.log("  Restoran — Producer (Kasir)");
    console.log("─".repeat(50));
    console.log(`Redis: ${connection.host}:${connection.port}\n`);

    const orderQueue = new Queue(QUEUE_NAME, { connection });

    // Bersihkan antrean lama agar demo bersih
    await orderQueue.obliterate({ force: true });
    console.log("Clear Antrian Lama\n");

    // Kirim daftar pesanan
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

    await orderQueue.close();
    process.exit(0);
}

runProducer().catch((err) => {
    console.error('Error occurred in Producer: ', err);
    process.exit(1);
});