import { GROUP_ID, TOPIC, isHrEmployeeEvent, kafka, type HrEmployeeEvent } from './kafka-config';

// running: npx tsx consumer.ts

type EmployeeData = NonNullable<HrEmployeeEvent['data']>;
const replica = new Map<number, EmployeeData>();

function applyEvent(event: HrEmployeeEvent): void {
  const { event_type, employee_id, data } = event;

  if (event_type === 'employee.terminated') {
    // soft-delete
    const existing = replica.get(employee_id);
    if (existing) {
      replica.set(employee_id, {
        ...existing,
        employment_status: 'TERMINATED',
        updated_at: new Date().toISOString(),
      });
      console.log(`  -> employee ${employee_id} ditandai TERMINATED`);
    } else {
      console.warn(`  -> employee ${employee_id} belum ada di replika, skip`);
    }
    return;
  }

  // created / updated
  if (!data) {
    console.warn(`  -> ${event_type} employee ${employee_id} tanpa data, skip (nanti: fallback gRPC)`);
    return;
  }


  const existing = replica.get(employee_id);
  if (existing && existing.updated_at >= data.updated_at) {
    console.warn(`  -> DITOLAK (stale): updated_at ${data.updated_at} <= ${existing.updated_at}`);
    return;
  }

  replica.set(employee_id, data);
  console.log(`  -> ${existing ? 'update' : 'insert'} employee ${employee_id} (${data.email}, salary ${data.salary})`);
}

async function main(): Promise<void> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  console.log(`Consumer siap | topic=${TOPIC} | group=${GROUP_ID}\n`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(message.value.toString());
      } catch {
        console.error(`[${topic}] P${partition} offset ${message.offset}: bukan JSON valid, skip`);
        return;
      }

      if (!isHrEmployeeEvent(parsed)) {
        console.error(`[${topic}] P${partition} offset ${message.offset}: bentuk event tidak valid, skip`);
        return;
      }

      console.log(
        `[${topic}] Partition-${partition} | Offset ${message.offset} | ${parsed.event_type} | employee=${parsed.employee_id}`,
      );

      try {
        applyEvent(parsed);
      } catch (err) {

        console.error('  -> gagal proses event:', err);
      }
    },
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} diterima, consumer berhenti...`);
    console.log(`Isi replika in-memory (${replica.size} employee):`);
    for (const [id, e] of replica) console.log(`  #${id} ${e.email} | ${e.employment_status} | salary ${e.salary}`);
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