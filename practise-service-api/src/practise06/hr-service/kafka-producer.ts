import { Partitioners, type Producer } from 'kafkajs';
import { kafka } from './kafka-config';



let producer: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
  if (producer) return producer;

  const p = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await p.connect();
  producer = p;
  return p;
}

export async function disconnectKafkaProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}