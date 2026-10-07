import { Kafka, logLevel } from 'kafkajs';

export const TOPIC = 'hr.employee.events';

export const kafka = new Kafka({
  clientId: 'hr-service-outbox-publisher',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
});

export type EmployeeEventType = 'employee.created' | 'employee.updated' | 'employee.terminated';


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