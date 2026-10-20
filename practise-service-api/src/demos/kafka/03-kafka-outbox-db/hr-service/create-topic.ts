import { NUM_PARTITIONS, TOPIC, kafka } from './kafka-config';

// Jalankan: npx tsx create-topic.ts
async function main(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();

  try {
    console.log('Existing topics:', await admin.listTopics());

    const created = await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic: TOPIC, numPartitions: NUM_PARTITIONS, replicationFactor: 1 }],
    });
    console.log(created ? 'Topic baru dibuat.' : 'Topic sudah ada, tidak ada perubahan.');

    const { topics } = await admin.fetchTopicMetadata({ topics: [TOPIC] });
    for (const t of topics) {
      console.log(`\n${t.name}`);
      for (const p of t.partitions.sort((a, b) => a.partitionId - b.partitionId)) {
        console.log(`  Partition-${p.partitionId}  leader=broker ${p.leader}`);
      }
    }
  } finally {
    await admin.disconnect();
  }
}

main().catch((err) => {
  console.error('Gagal membuat topic:', err);
  process.exit(1);
});