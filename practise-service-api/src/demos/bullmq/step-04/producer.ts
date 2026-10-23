import { pool } from './db';
import { relayOnce, tutupRelay } from './outbox';
import { simpanPesanan } from './repo';
import type { PesananInput } from './config';

// ============================================================================
// PRODUCER (Pelayan / Kasir / Order Form): simpan ke Postgres, lalu antre ke BullMQ.
// Jalankan demo: npx tsx producer.ts
// ============================================================================

export async function kirimPesanan(p: PesananInput): Promise<void> {
  const tag = p.vip ? ' [VIP]' : '';
  const delay = p.preorderDetik ? ` (pre-order, +${p.preorderDetik}s)` : '';

  // 1) Simpan di Postgres (satu transaksi). Setelah baris ini, pesanan AMAN walau Redis mati.
  const { dibuat, itemIds } = await simpanPesanan(p);
  if (!dibuat) {
    console.log(`↩️  [${p.sumber}] ${p.orderId} sudah pernah diterima — diabaikan (idempotent)`);
    return;
  }
  console.log(`📝 [${p.sumber}] ${p.orderId} | ${p.meja} | ${p.items.join(', ')}${tag}${delay} -> item ${itemIds.join(', ')}`);

  // 2) Coba antre sekarang supaya cepat. Gagal bukan masalah: item tetap PENDING
  //    di DB dan akan diambil relay berikutnya.
  try {
    await relayOnce();
  } catch (err) {
    console.warn(`⚠️  ${p.orderId} tersimpan, tapi belum masuk antrean (${(err as Error).message}). Relay akan mengulang.`);
  }
}

async function demo(): Promise<void> {
  const pesanan: PesananInput[] = [
    { orderId: 'W-001', meja: 'Meja 1', items: ['Nasi Goreng', 'Es Teh'], sumber: 'waiter' },
    { orderId: 'C-001', meja: 'Meja 2', items: ['Mie Ayam', 'Kopi Susu'], sumber: 'cashier' },
    { orderId: 'F-001', meja: 'Meja 3', items: ['Sate Ayam', 'Jus Alpukat'], sumber: 'order-form' },
    { orderId: 'C-002', meja: 'Meja 4', items: ['Ayam Bakar'], sumber: 'cashier', simulasiGagal: 2 }, // gosong 2x lalu sukses
    { orderId: 'W-002', meja: 'Meja 5', items: ['Rendang', 'Teh Tarik'], sumber: 'waiter', simulasiGagal: 99 }, // selalu gagal
    { orderId: 'W-003', meja: 'Meja VIP-99', items: ['Steak Wagyu', 'Kopi Susu'], sumber: 'waiter', vip: true },
    { orderId: 'F-002', meja: 'Meja 7', items: ['Nasi Goreng', 'Jus Alpukat'], sumber: 'order-form', preorderDetik: 15 },
    { orderId: 'W-001', meja: 'Meja 1', items: ['Nasi Goreng', 'Es Teh'], sumber: 'waiter' }, // kirim ulang -> diabaikan
  ];

  try {
    for (const p of pesanan) await kirimPesanan(p);
    console.log('\n✅ Selesai. Nyalakan worker, lalu pantau: npx tsx status.ts --watch');
  } finally {
    await tutupRelay();
    await pool.end();
  }
}

if (require.main === module) {
  demo().catch((err) => {
    console.error('Gagal mengirim pesanan:', err);
    process.exit(1);
  });
}
