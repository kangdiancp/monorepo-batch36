import type { PoolClient } from 'pg';
import { MENU, STATUS_ITEM, type PesananInput } from './config';
import { pool, tx } from './db';

// ------------------------------------------------------------------ PRODUCER

/**
 * Simpan pesanan + semua item dalam SATU transaksi (semua tersimpan atau tidak sama sekali).
 * Item masuk dengan status PENDING — itulah "outbox": penanda bahwa item ini
 * SUDAH di DB tapi BELUM diantrekan ke BullMQ.
 * order_id yang sudah ada -> dibalas dibuat=false (idempotent), tidak ada item dobel.
 */
export async function simpanPesanan(p: PesananInput): Promise<{ dibuat: boolean; itemIds: number[] }> {
  return tx(async (c) => {
    const o = await c.query(
      `INSERT INTO resto.orders (order_id, meja, sumber, vip)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id) DO NOTHING
       RETURNING order_id`,
      [p.orderId, p.meja, p.sumber, p.vip ?? false],
    );
    if (o.rowCount === 0) return { dibuat: false, itemIds: [] };

    const itemIds: number[] = [];
    for (const menu of p.items) {
      const info = MENU[menu];
      if (!info) throw new Error(`Menu tidak dikenal: "${menu}"`); // -> ROLLBACK seluruh pesanan
      const r = await c.query(
        `INSERT INTO resto.order_items (order_id, menu, station, available_at, simulasi_gagal)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + make_interval(secs => $4::int), $5)
         RETURNING item_id::int AS item_id`,
        [p.orderId, menu, info.station, p.preorderDetik ?? 0, p.simulasiGagal ?? null],
      );
      itemIds.push(r.rows[0].item_id as number);
    }
    return { dibuat: true, itemIds };
  });
}

// ------------------------------------------------------------------ WORKER

export interface ItemDimasak {
  item_id: number;
  order_id: string;
  menu: string;
  simulasi_gagal: number | null;
  meja: string;
  vip: boolean;
}

/**
 * Tandai COOKING. Return null kalau item sudah DONE/FAILED (job duplikat,
 * mis. diantre ulang) -> worker harus MELEWATI, jangan masak dua kali.
 */
export async function mulaiMasak(itemId: number, koki: string, percobaan: number): Promise<ItemDimasak | null> {
  const { rows } = await pool.query(
    `UPDATE resto.order_items i
        SET status = 'COOKING', attempts = $3, cooked_by = $2,
            started_at = COALESCE(i.started_at, CURRENT_TIMESTAMP)
       FROM resto.orders o
      WHERE i.item_id = $1 AND o.order_id = i.order_id
        AND i.status IN ('PENDING', 'QUEUED', 'RETRYING', 'COOKING')
      RETURNING i.item_id::int AS item_id, i.order_id, i.menu, i.simulasi_gagal, o.meja, o.vip`,
    [itemId, koki, percobaan],
  );
  if (rows.length === 0) return null;

  await pool.query(
    `UPDATE resto.orders SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1 AND status = 'RECEIVED'`,
    [rows[0].order_id],
  );
  return rows[0] as ItemDimasak;
}

/** Status order DITURUNKAN dari status semua itemnya (bukan diisi manual). */
async function hitungStatusOrder(c: PoolClient, orderId: string): Promise<void> {
  await c.query(
    `UPDATE resto.orders o
        SET status = s.status, updated_at = CURRENT_TIMESTAMP
       FROM (SELECT CASE
                      WHEN COUNT(*) FILTER (WHERE status NOT IN ('DONE', 'FAILED')) > 0 THEN 'IN_PROGRESS'
                      WHEN COUNT(*) FILTER (WHERE status = 'FAILED') > 0 THEN 'FAILED'
                      ELSE 'READY'
                    END AS status
               FROM resto.order_items WHERE order_id = $1) s
      WHERE o.order_id = $1`,
    [orderId],
  );
}

export async function tandaiSelesai(itemId: number): Promise<void> {
  await tx(async (c) => {
    const r = await c.query(
      `UPDATE resto.order_items
          SET status = 'DONE', finished_at = CURRENT_TIMESTAMP, last_error = NULL
        WHERE item_id = $1
        RETURNING order_id`,
      [itemId],
    );
    if (r.rows[0]) await hitungStatusOrder(c, r.rows[0].order_id);
  });
}

/** Dipanggil di SETIAP percobaan gagal. permanen=true -> FAILED, selain itu RETRYING. */
export async function catatGagal(itemId: number, pesan: string, permanen: boolean, percobaan: number): Promise<void> {
  await tx(async (c) => {
    const r = await c.query(
      `UPDATE resto.order_items
          SET status = CASE WHEN $3::boolean THEN 'FAILED' ELSE 'RETRYING' END,
              last_error = $2, attempts = $4,
              finished_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE item_id = $1 AND status <> 'DONE'
        RETURNING order_id`,
      [itemId, pesan, permanen, percobaan],
    );
    if (r.rows[0]) await hitungStatusOrder(c, r.rows[0].order_id);
  });
}

// ------------------------------------------------------------------ MONITORING

export async function hitungItemPerStatus(): Promise<Record<string, Record<string, number>>> {
  const { rows } = await pool.query(
    `SELECT station, status, COUNT(*)::int AS n FROM resto.order_items GROUP BY station, status`,
  );
  const hasil: Record<string, Record<string, number>> = {};
  for (const station of ['makanan', 'minuman']) {
    hasil[station] = Object.fromEntries(STATUS_ITEM.map((s) => [s, 0]));
  }
  for (const r of rows) hasil[r.station]![r.status] = r.n;
  return hasil;
}

export async function pesananTerbaru(limit = 10) {
  const { rows } = await pool.query(
    `SELECT o.order_id, o.meja, o.sumber, o.vip, o.status,
            string_agg(i.menu || ':' || i.status, ', ' ORDER BY i.item_id) AS items
       FROM resto.orders o
       JOIN resto.order_items i USING (order_id)
      GROUP BY o.order_id
      ORDER BY o.created_at DESC, o.order_id
      LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function itemGagal(limit = 20) {
  const { rows } = await pool.query(
    `SELECT item_id::int AS item_id, order_id, menu, attempts, last_error
       FROM resto.order_items WHERE status = 'FAILED' ORDER BY item_id DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
