import { Kafka, logLevel } from 'kafkajs';

// Satu perusahaan = satu topic = satu consumer group.
export const COMPANIES = {
  abc: { name: 'PT. ABC', topic: 'lamaran-abc', groupId: 'hrd-abc' },
  xyz: { name: 'PT. XYZ', topic: 'lamaran-xyz', groupId: 'hrd-xyz' },
} as const;

export type CompanyCode = keyof typeof COMPANIES;

export const NUM_PARTITIONS = 3;

// 1 broker saja
export const kafka = new Kafka({
  clientId: 'lamaran-demo',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
});