import { pool } from './db';
import { relayOnce, closeRelay } from './outbox';
import { saveOrder } from './repo';
import type { OrderInput } from './config';


// PRODUCER (Pelayan / Kasir / Order Form): simpan ke Postgres, lalu antre ke BullMQ.
// Jalankan demo: npx tsx producer.ts
export async function sendOrder(p: OrderInput): Promise<void> {
  const tag = p.vip ? ' [VIP]' : '';
  const delay = p.preorderDetik ? ` (pre-order, +${p.preorderDetik}s)` : '';

  // 1) Simpan di Postgres (satu transaksi), agar order aman jika Redis mati.
  const { dibuat, itemIds } = await saveOrder(p);
  if (!dibuat) {
    console.log(`[${p.sumber}] ${p.orderId} sudah pernah diterima — diabaikan (idempotent)`);
    return;
  }
  console.log(`[${p.sumber}] ${p.orderId} | ${p.meja} | ${p.items.join(', ')}${tag}${delay} -> item ${itemIds.join(', ')}`);

  // jika gagal akan di relay
  try {
    await relayOnce();
  } catch (err) {
    console.warn(`${p.orderId} tersimpan, tapi belum masuk antrean (${(err as Error).message}). Relay akan mengulang.`);
  }
}

async function demo(): Promise<void> {
  const pesanan: OrderInput[] = [
    { orderId: 'W-001', meja: 'Meja 1', items: ['Nasi Goreng', 'Es Teh'], sumber: 'waiter' },
    { orderId: 'C-001', meja: 'Meja 2', items: ['Mie Ayam', 'Kopi Susu'], sumber: 'cashier' },
    { orderId: 'F-001', meja: 'Meja 3', items: ['Sate Ayam', 'Jus Alpukat'], sumber: 'order-form' },
    { orderId: 'C-002', meja: 'Meja 4', items: ['Ayam Bakar'], sumber: 'cashier', simulasiFailed: 2 }, // gosong 2x gagal lalu sukses
    { orderId: 'W-002', meja: 'Meja 5', items: ['Rendang', 'Teh Tarik'], sumber: 'waiter', simulasiFailed: 99 }, // selalu gagal
    { orderId: 'W-003', meja: 'Meja VIP-99', items: ['Steak Wagyu', 'Kopi Susu'], sumber: 'waiter', vip: true },
    { orderId: 'F-002', meja: 'Meja 7', items: ['Nasi Goreng', 'Jus Alpukat'], sumber: 'order-form', preorderDetik: 15 },
    { orderId: 'W-001', meja: 'Meja 1', items: ['Nasi Goreng', 'Es Teh'], sumber: 'waiter' }, // kirim ulang -> diabaikan
  ];

  try {
    for (const p of pesanan) await sendOrder(p);
    console.log('\nSelesai. Nyalakan worker, lalu pantau: npx tsx status.ts --watch');
  } finally {
    await closeRelay();
    await pool.end();
  }
}

if (require.main === module) {
  demo().catch((err) => {
    console.error('Gagal mengirim pesanan:', err);
    process.exit(1);
  });
}
