import { Kafka, logLevel } from 'kafkajs';

export const TOPIC = 'hr.employee.events';
export const GROUP_ID = 'payroll-service.employee-sync';

export const kafka = new Kafka({
  clientId: 'payroll-service-employee-sync',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
});

export const EVENT_TYPES = ['employee.created', 'employee.updated', 'employee.terminated'] as const;
export type EmployeeEventType = (typeof EVENT_TYPES)[number];


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

  const baseOk =
    typeof v.event_type === 'string' &&
    (EVENT_TYPES as readonly string[]).includes(v.event_type) &&
    typeof v.employee_id === 'number' &&
    typeof v.occurred_at === 'string';
  if (!baseOk) return false;

  if (v.data === null) return true;
  if (typeof v.data !== 'object' || v.data === undefined) return false;

  const d = v.data as Record<string, unknown>;
  return (
    typeof d.last_name === 'string' &&
    typeof d.email === 'string' &&
    typeof d.salary === 'string' &&
    typeof d.employment_status === 'string' &&
    typeof d.employment_type === 'string' &&
    typeof d.updated_at === 'string'
  );
}