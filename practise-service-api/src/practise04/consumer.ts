import { COMPANIES, kafka, type CompanyCode } from './kafka-config';

// Cara pakai:
//   COMPANY=abc npx tsx consumer.ts     -> HRD PT. ABC (group hrd-abc)
//   COMPANY=xyz npx tsx consumer.ts     -> HRD PT. XYZ (group hrd-xyz)
function resolveCompany(): CompanyCode {
  const code = (process.env.COMPANY ?? process.argv[2] ?? '').toLowerCase();
  if (code !== 'abc' && code !== 'xyz') {
    console.error('Tentukan perusahaan: COMPANY=abc atau COMPANY=xyz');
    process.exit(1);
  }
  return code;
}

async function main(): Promise<void> {
  const code = resolveCompany();
  const { name, topic, groupId } = COMPANIES[code];

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();


  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`HRD ${name} siap | topic=${topic} | group=${groupId}\n`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;
      const surat = JSON.parse(message.value.toString()) as {
        surat_id: string;
        applicant_id: string;
      };

      // Alamat lengkap sebuah surat teridiri dari (topic, partition, offset)
      console.log(
        `[${topic}] Partition-${partition} | Offset ${message.offset} -> Surat ${surat.surat_id} dari ${surat.applicant_id}`,
      );
    },
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} diterima, consumer berhenti...`);
    await consumer.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Consumer gagal jalan:', err);
  process.exit(1);
});