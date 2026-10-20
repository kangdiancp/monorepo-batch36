import type { EachMessagePayload } from 'kafkajs';
import { GROUP_ID, TOPIC, isHrEmployeeEvent, kafka, type HrEmployeeEvent } from './kafka-config';
import { markEmployeeTerminated, upsertEmployee } from './hr-employee-replica';



const consumer = kafka.consumer({ groupId: GROUP_ID });

function toReplicaInput(event: HrEmployeeEvent & { data: NonNullable<HrEmployeeEvent['data']> }) {
  return {
    employeeId: event.employee_id,
    firstName: event.data.first_name,
    lastName: event.data.last_name,
    email: event.data.email,
    departmentId: event.data.department_id,
    salary: event.data.salary,
    employmentStatus: event.data.employment_status,
    employmentType: event.data.employment_type,
    updatedAt: event.data.updated_at,
  };
}

async function handleEvent(event: HrEmployeeEvent): Promise<void> {
  switch (event.event_type) {
    case 'employee.created':
    case 'employee.updated': {
      if (!event.data) {

        console.warn(`  -> ${event.event_type} employee=${event.employee_id} tanpa data, skip`);
        return;
      }

      const applied = await upsertEmployee(toReplicaInput({ ...event, data: event.data }));
      if (!applied) {
        console.warn(`  -> SKIP employee=${event.employee_id}: event duplikat / lebih lama dari data replika`);
      } else {
        const action = event.event_type === 'employee.created' ? 'INSERT' : 'UPDATE';
        console.log(`  -> ${action} employee=${event.employee_id} (${event.data.email}, salary ${event.data.salary})`);
      }
      return;
    }

    case 'employee.terminated': {
      const found = await markEmployeeTerminated(event.employee_id);
      if (found) {
        console.log(`  -> employee=${event.employee_id} status diubah jadi TERMINATED`);
      } else {
        console.warn(`  -> employee=${event.employee_id} belum ada di replika, skip`);
      }
      return;
    }

    default: {
      const _exhaustive: never = event.event_type;
      throw new Error(`event_type tidak dikenal: ${String(_exhaustive)}`);
    }
  }
}

async function handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
  if (!message.value) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(message.value.toString());
  } catch {
    console.error(`[employee-sync] ${topic} P${partition} offset ${message.offset}: bukan JSON valid, skip`);
    return;
  }

  if (!isHrEmployeeEvent(parsed)) {
    console.error(`[employee-sync] ${topic} P${partition} offset ${message.offset}: bentuk event tidak valid, skip`);
    return;
  }

  console.log(
    `[employee-sync] Partition-${partition} | Offset ${message.offset} | ${parsed.event_type} | employee=${parsed.employee_id}`,
  );
  await handleEvent(parsed); 
}

export async function startEmployeeSyncConsumer(): Promise<void> {
  await consumer.connect();

  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  await consumer.run({ eachMessage: handleMessage });

  console.log(`[employee-sync] consumer started | topic=${TOPIC} | group=${GROUP_ID}`);
}

export async function stopEmployeeSyncConsumer(): Promise<void> {
  await consumer.disconnect();
}

if (require.main === module) {
  const shutdown = async (signal: string) => {
    console.log(`\n[employee-sync] ${signal} diterima, consumer berhenti...`);
    await stopEmployeeSyncConsumer();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  startEmployeeSyncConsumer().catch((err) => {
    console.error('[employee-sync] fatal error saat start consumer:', err);
    process.exit(1);
  });
}