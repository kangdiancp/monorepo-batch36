export const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379
};

export const QUEUE_NAME = "order-food";

// Priority (lower number = higher priority)
export const PRIORITY = {
  VIP: 1,
  REGULER: 10,
  BATCH: 20,
} as const;

export type CustomerType = "VIP" | "Reguler" | "Batch";

export interface OrderData {
  orderId: string;
  item: string;
  customerType: CustomerType;
}