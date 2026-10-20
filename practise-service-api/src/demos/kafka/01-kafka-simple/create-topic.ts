import { COMPANIES, NUM_PARTITIONS, kafka } from './kafka-config';


async function main(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();


  const topics = await admin.listTopics();
  console.log('Existing topics:', topics);


  try {
    const topics = Object.values(COMPANIES).map((c) => c.topic);

    // createTopics return false kalau semua topic sudah ada (dan aman jika di re-running).
    const created = await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map((topic) => ({
        topic,
        numPartitions: NUM_PARTITIONS,
        replicationFactor: 1, // 1 broker -> 1 Replicator
      })),
    });
    console.log(created ? 'Topic baru dibuat.' : 'Topic sudah ada, tidak ada perubahan.');

    const { topics: metadata } = await admin.fetchTopicMetadata({ topics });
    for (const t of metadata) {
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