import { Kafka, logLevel } from 'kafkajs';

// Satu perusahaan = satu topic = satu consumer group (liat diagram).
export const COMPANIES = {
  abc: { name: 'PT. ABC', topic: 'lamaran-abc', groupId: 'hrd-abc' },
  xyz: { name: 'PT. XYZ', topic: 'lamaran-xyz', groupId: 'hrd-xyz' },
} as const;

export type CompanyCode = keyof typeof COMPANIES;

// 3 laci per topic: Partition-0, Partition-1, Partition-2
export const NUM_PARTITIONS = 3;

export const kafka = new Kafka({
  clientId: 'lamaran-demo',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
});