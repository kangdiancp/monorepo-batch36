export const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const STATIONS = {
  makanan: { label: 'Dapur Makanan', queue: 'order-makanan', limiter: { max: 4, duration: 8_000 } },
  minuman: { label: 'Bar Minuman', queue: 'order-minuman', limiter: { max: 10, duration: 8_000 } },
} as const;
export type StationCode = keyof typeof STATIONS;

export const WORKERS = {
  'koki-1': { nama: 'Koki 1', station: 'makanan', concurrency: 1 },
  'koki-2': { nama: 'Koki 2', station: 'makanan', concurrency: 1 },
  barista: { nama: 'Barista', station: 'minuman', concurrency: 2 },
} as const;
export type WorkerCode = keyof typeof WORKERS;

//record mirip dengan map yg punya key & value
export const MENU: Record<string, { station: StationCode; cookMs: number }> = {
  'Nasi Goreng': { station: 'makanan', cookMs: 2000 },
  'Mie Ayam': { station: 'makanan', cookMs: 2000 },
  'Sate Ayam': { station: 'makanan', cookMs: 2400 },
  'Ayam Bakar': { station: 'makanan', cookMs: 2400 },
  Rendang: { station: 'makanan', cookMs: 2400 },
  'Steak Wagyu': { station: 'makanan', cookMs: 3000 },
  'Es Teh': { station: 'minuman', cookMs: 800 },
  'Kopi Susu': { station: 'minuman', cookMs: 1200 },
  'Jus Alpukat': { station: 'minuman', cookMs: 1200 },
  'Teh Tarik': { station: 'minuman', cookMs: 1000 },
};

export type Sumber = 'waiter' | 'cashier' | 'order-form';

export interface OrderInput {
  orderId: string;
  meja: string;
  items: string[];
  sumber: Sumber;
  vip?: boolean;
  preorderDetik?: number;
  simulasiFailed?: number; // untuk demo (99 = selalu gagal)
}


export interface ItemJob {
  itemId: number;
}

export const STATUS_ITEM = ['PENDING', 'QUEUED', 'COOKING', 'RETRYING', 'DONE', 'FAILED'] as const;

// angka terkecil atau tanpa priority yg diprioritaskan
export const PRIORITY = { VIP: 1, REGULER: 10 } as const;

export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const ENQUEUE_TIMEOUT_MS = 3000;
