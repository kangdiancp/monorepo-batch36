import { Kafka, Partitioners, type Producer } from 'kafkajs';

// ============================================================================
// producer.ts — dipakai HANYA oleh outbox-publisher.worker.ts.
// Modul lain (controller/service/repository) TIDAK boleh import ini langsung
// — publish ke Kafka SELALU lewat outbox table, supaya tetap dalam
// transactional outbox pattern (lihat employees.repository.ts).
// ============================================================================

const kafka = new Kafka({
    clientId: 'hr-service-outbox-publisher',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

let producer: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
    if (producer) return producer;

    producer = kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        // idempotent: true, // aktifkan kalau versi Kafka broker & kafkajs mendukung,
        // supaya retry dari sisi producer sendiri tidak menghasilkan duplicate message.
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