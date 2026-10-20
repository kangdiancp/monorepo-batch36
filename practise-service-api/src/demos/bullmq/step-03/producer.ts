import { Queue } from "bullmq";
import { connection, QUEUE_NAME, PRIORITY, OrderData } from "./bullmq-config";

async function runProducer() {
  console.log("─".repeat(50));
  console.log("  Restoran — Producer (Kasir)");
  console.log("─".repeat(50));
  console.log(`Redis: ${connection.host}:${connection.port}\n`);

  const orderQueue = new Queue<OrderData>(QUEUE_NAME, { connection });

  // Bersihkan antrean lama
  await orderQueue.obliterate({ force: true });
  console.log("Antrian dibersihkan\n");

  console.log("Kasir catat pesanan...\n");

  // Reguler masuk lebih dulu
  await orderQueue.add(
    "order-food",
    { orderId: "1", item: "Nasi Goreng", customerType: "Reguler" },
    { priority: PRIORITY.REGULER }
  );

  await orderQueue.add(
    "order-food",
    { orderId: "2", item: "Pisang Goreng", customerType: "Reguler" },
    { priority: PRIORITY.REGULER }
  );

  await orderQueue.add(
    "order-food",
    { orderId: "3", item: "Hot Milk", customerType: "Reguler" },
    { priority: PRIORITY.REGULER }
  );

  // VIP datang belakangan → harusnya dikerjakan PERTAMA karena priority lebih tinggi (1)
  await orderQueue.add(
    "order-food",
    { orderId: "4", item: "Steak Wagyu", customerType: "VIP" },
    { priority: PRIORITY.VIP }
  );

  // Batch paling rendah
  await orderQueue.add(
    "order-food",
    { orderId: "5", item: "Nasi Kotak x50", customerType: "Batch" },
    { priority: PRIORITY.BATCH }
  );

  console.log("Semua pesanan masuk antrian!\n");
  console.log("Expectation output list (semua priority > 0):");
  console.log("  1. VIP      Steak Wagyu      priority 1   ← lompat ke depan");
  console.log("  2. Reguler  Nasi Goreng      priority 10");
  console.log("  3. Reguler  Pisang Goreng    priority 10");
  console.log("  4. Reguler  Hot Milk         priority 10");
  console.log("  5. Batch    Nasi Kotak x50   priority 20\n");

  await orderQueue.close();
  process.exit(0);
}

runProducer().catch((err) => {
  console.error("\nError di Producer:", err.message || err);
  if (String(err.message || err).includes("ECONNREFUSED")) {
    console.error(`Gagal koneksi ke redis di ${connection.host}:${connection.port}. Pastikan Redis sudah berjalan.`);
  }
  process.exit(1);
});