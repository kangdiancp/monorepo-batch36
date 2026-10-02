import { Kafka, Partitioners, type Producer } from 'kafkajs';


const kafka = new Kafka({
    clientId: 'hr-service-outbox-publisher',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

let producer: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
    if (producer) return producer;

    producer = kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
    });
    await producer.connect();
    return producer;
}

export async function disconnectKafkaProducer(): Promise<void> {
    if (producer) {
        await producer.disconnect();
        producer = null;
    }
}