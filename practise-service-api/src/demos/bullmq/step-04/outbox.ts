import { Queue } from 'bullmq';
import {
  DEFAULT_JOB_OPTS,
  ENQUEUE_TIMEOUT_MS,
  PRIORITY,
  STATIONS,
  connection,
  type ItemJob,
  type StationCode,
} from './config';
import { tx } from './db';


// OUTBOX RELAY: memindahkan item PENDING (di Postgres) menjadi job BullMQ.
const queues = new Map<StationCode, Queue<ItemJob>>();

function getQueue(code: StationCode): Queue<ItemJob> {
  let q = queues.get(code);
  if (!q) {
    q = new Queue<ItemJob>(STATIONS[code].queue, { connection });
    queues.set(code, q);
  }
  return q;
}

/** kasih timeout jika Redis mati -> queue.add() bisa menggantung lama; kasih timeout supaya cepat gagal klo kelamaan. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout setelah ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Satu putaran relay. Return jumlah item yang berhasil diantre-kan. Throw kalau Redis bermasalah. */
export async function relayOnce(batchSize = 50): Promise<number> {
  return tx(async (c) => {
    // Delay pre-order dihitung di DB (CURRENT_TIMESTAMP DB), bukan di app -> spy ga ngaruh di time.
    const { rows } = await c.query(
      `SELECT i.item_id::int AS item_id, i.station, o.vip,
              GREATEST(0, EXTRACT(EPOCH FROM (i.available_at - CURRENT_TIMESTAMP)) * 1000)::int AS delay_ms
         FROM resto.order_items i
         JOIN resto.orders o USING (order_id)
        WHERE i.status = 'PENDING'
        ORDER BY i.item_id
        LIMIT $1
        FOR UPDATE OF i SKIP LOCKED`,
      [batchSize],
    );
    if (rows.length === 0) return 0;

    for (const r of rows as { item_id: number; station: StationCode; vip: boolean; delay_ms: number }[]) {
      await withTimeout(
        getQueue(r.station).add(
          'masak',
          { itemId: r.item_id },
          {
            jobId: `item-${r.item_id}`, // idempotent
            priority: r.vip ? PRIORITY.VIP : PRIORITY.REGULER,
            ...(r.delay_ms > 0 ? { delay: r.delay_ms } : {}), // pre-order
            ...DEFAULT_JOB_OPTS,
          },
        ),
        ENQUEUE_TIMEOUT_MS,
        'queue.add',
      );
    }

    // worker akan ambil job yg status=QUEUED
    await c.query(
      `UPDATE resto.order_items SET status = 'QUEUED', queued_at = CURRENT_TIMESTAMP
        WHERE item_id = ANY($1::bigint[])`,
      [rows.map((r) => r.item_id)],
    );
    return rows.length;
  });
}

export function startRelayLoop(intervalMs: number, log: (m: string) => void): () => void {
  const jalan = () =>
    relayOnce()
      .then((n) => n > 0 && log(`relay: ${n} item diantre-kan dari Postgres ke BullMQ`))
      .catch((e: Error) => log(`relay gagal (item tetap PENDING, dicoba lagi): ${e.message}`));

  void jalan();
  const timer = setInterval(() => void jalan(), intervalMs);
  return () => clearInterval(timer);
}

export async function closeRelay(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
