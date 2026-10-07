import { Kafka, logLevel } from 'kafkajs';

export const TOPIC = 'hr.employee.events';
export const GROUP_ID = 'payroll-service.employee-sync';
export const NUM_PARTITIONS = 3;

export const kafka = new Kafka({
  clientId: 'hr-service-outbox-publisher',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
});

//export type EmployeeEventType = 'employee.created' | 'employee.updated' | 'employee.terminated';

export const EVENT_TYPES = ['employee.created', 'employee.updated', 'employee.terminated'] as const;
export type EmployeeEventType = (typeof EVENT_TYPES)[number];

// kontrak interface
export interface HrEmployeeEvent {
  event_type: EmployeeEventType;
  employee_id: number;
  occurred_at: string;
  data: {
    first_name: string | null;
    last_name: string;
    email: string;
    department_id: number | null;
    salary: string;
    employment_status: string;
    employment_type: string;
    updated_at: string;
  } | null;
}

export function isHrEmployeeEvent(value: unknown): value is HrEmployeeEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.event_type === 'string' &&
    (EVENT_TYPES as readonly string[]).includes(v.event_type) &&
    typeof v.employee_id === 'number' &&
    typeof v.occurred_at === 'string' &&
    (v.data === null || typeof v.data === 'object')
  );
}