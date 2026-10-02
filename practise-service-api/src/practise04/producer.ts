import { Partitioners } from 'kafkajs';
import { COMPANIES, kafka, type CompanyCode } from './kafka-config';


const PIN_PARTITIONS = process.env.PIN_PARTITIONS === 'true';

interface Surat {
  id: string; // A..J
  applicantId: string; // dipakai sebagai KEY
  company: CompanyCode; // define TOPIC
  pinnedPartition: number; // hanya dipakai kalau PIN_PARTITIONS=true
}

// 10 surat: 5 ke ABC, 5 ke XYZ (liat diagram)
// Surat dari pelamar yang sama (key sama) selalu satu partisi -> jd urutan terjaga, ga bakal loncat partisi.
const SURAT: Surat[] = [
  { id: 'A', applicantId: 'pelamar-01', company: 'abc', pinnedPartition: 0 },
  { id: 'B', applicantId: 'pelamar-01', company: 'abc', pinnedPartition: 0 },
  { id: 'C', applicantId: 'pelamar-01', company: 'abc', pinnedPartition: 0 },
  { id: 'D', applicantId: 'pelamar-02', company: 'abc', pinnedPartition: 1 },
  { id: 'E', applicantId: 'pelamar-03', company: 'abc', pinnedPartition: 2 },

  { id: 'F', applicantId: 'pelamar-04', company: 'xyz', pinnedPartition: 0 },
  { id: 'G', applicantId: 'pelamar-05', company: 'xyz', pinnedPartition: 1 },
  { id: 'H', applicantId: 'pelamar-05', company: 'xyz', pinnedPartition: 1 },
  { id: 'I', applicantId: 'pelamar-06', company: 'xyz', pinnedPartition: 2 },
  { id: 'J', applicantId: 'pelamar-06', company: 'xyz', pinnedPartition: 2 },
];

async function main(): Promise<void> {
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });
  await producer.connect();

  console.log(
    `Mengirim ${SURAT.length} surat (mode partisi: ${PIN_PARTITIONS ? 'dipaksa sesuai diagram' : 'hash key'})\n`,
  );

  try {
   
    for (const surat of SURAT) {
      const { topic, name } = COMPANIES[surat.company];

      const [meta] = await producer.send({
        topic,
        messages: [
          {
            key: surat.applicantId,
            value: JSON.stringify({
              surat_id: surat.id,
              applicant_id: surat.applicantId,
              company: name,
              sent_at: new Date().toISOString(),
            }),
            ...(PIN_PARTITIONS && { partition: surat.pinnedPartition }),
          },
        ],
      });

      if (!meta) throw new Error(`Tidak ada metadata balasan untuk surat ${surat.id}`);

      console.log(
        `Surat ${surat.id} (${surat.applicantId}) -> ${topic} | Partition-${meta.partition} | Offset ${meta.baseOffset}`,
      );
    }
  } finally {
    await producer.disconnect();
  }
}

main().catch((err) => {
  console.error('Gagal mengirim surat:', err);
  process.exit(1);
});