import type { TaskType } from '../../db/schema';

export const PAYROLL_DOMAIN_CONTEXT = 'PAYROLL';

/** 
 * 
 * Kita definisikan dulu saga taskname : 
 * 1. Kalo data sudah ada, kita bisa skip function yg ada di file ini.
 * 2. Kalo kita ingin insert seed data otomatis, kita execute function di file ini.  
 * 
 * */
export const PAYROLL_TASK_CODE = {
  RUN_PAYROLL: 'RUN_PAYROLL',
  CALCULATE_ATTENDANCE: 'CALCULATE_ATTENDANCE',
  CALCULATE_BUSINESS_TRIP: 'CALCULATE_BUSINESS_TRIP',
  CALCULATE_OVERTIME: 'CALCULATE_OVERTIME',
  CALCULATE_HEALTH_INSURANCE: 'CALCULATE_HEALTH_INSURANCE',
  GENERATE_PAYROLL_EMPLOYEE: 'GENERATE_PAYROLL_EMPLOYEE',
  APPROVAL_DIRECTOR_FINANCE: 'APPROVAL_DIRECTOR_FINANCE',
  APPROVAL_DIRECTOR_UTAMA: 'APPROVAL_DIRECTOR_UTAMA',
  KLIRING_TO_BANK: 'KLIRING_TO_BANK',
  CALLBACK_FROM_BANK: 'CALLBACK_FROM_BANK',
  SEND_NOTIF_TO_EMPLOYEE: 'SEND_NOTIF_TO_EMPLOYEE',
  SYSTEM_CLOSED: 'SYSTEM_CLOSED',
} as const;

export interface PayrollSagaTaskDefinition {
  domain_context: string;
  task_code: string;
  task_name: string;
  sequence_order: number;
  task_type: TaskType;
  assigned_role: string | null;
  is_required: boolean;
  can_skip: boolean;
}

const def = (
  sequence_order: number,
  task_code: string,
  task_name: string,
  task_type: TaskType,
  assigned_role: string | null = null,
  can_skip = false,
): PayrollSagaTaskDefinition => ({
  domain_context: PAYROLL_DOMAIN_CONTEXT,
  task_code,
  task_name,
  sequence_order,
  task_type,
  assigned_role,
  is_required: true,
  can_skip,
});

const C = PAYROLL_TASK_CODE;

// task_name dicocokkan MANUAL dengan saga_tasks.task_name (tidak ada FK) — jangan ubah
export const PAYROLL_SAGA_TASK_DEFINITIONS: PayrollSagaTaskDefinition[] = [
  def(1, C.RUN_PAYROLL, 'Run Payroll', 'MANUAL', 'PAYROLL_ADMIN'),
  def(2, C.CALCULATE_ATTENDANCE, 'Calculate Absensi', 'AUTO'),
  def(3, C.CALCULATE_BUSINESS_TRIP, 'Calculate Business Trip', 'AUTO'),
  def(4, C.CALCULATE_OVERTIME, 'Calcaulate overtime', 'AUTO'),
  def(5, C.CALCULATE_HEALTH_INSURANCE, 'Calcaulate Health Insurance', 'AUTO'),
  def(6, C.GENERATE_PAYROLL_EMPLOYEE, 'Generate Payroll Employee', 'AUTO'),
  def(7, C.APPROVAL_DIRECTOR_FINANCE, 'Approval from Director Finance', 'MANUAL', 'DIRECTOR_FINANCE'),
  def(8, C.APPROVAL_DIRECTOR_UTAMA, 'Approval from Director Utama', 'MANUAL', 'DIRECTOR_UTAMA'),
  def(9, C.KLIRING_TO_BANK, 'Kliring To Bank', 'INTEGRATION'),
  def(10, C.CALLBACK_FROM_BANK, 'Callback From Bank', 'INTEGRATION'),
  def(11, C.SEND_NOTIF_TO_EMPLOYEE, 'Send Notif To Employee', 'NOTIF', null, true),
  def(12, C.SYSTEM_CLOSED, 'System Closed', 'AUTO'),
];