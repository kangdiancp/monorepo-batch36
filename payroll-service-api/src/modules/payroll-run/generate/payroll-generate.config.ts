import { PAYROLL_DOMAIN_CONTEXT, PAYROLL_TASK_CODE as C } from '../../saga/payroll-saga-tasks';


export const PAYROLL_DOMAIN = PAYROLL_DOMAIN_CONTEXT;

/** Jumlah employee per batch job. Tiap batch = 1 job per task. */
export const BATCH_SIZE = Number(process.env.PAYROLL_BATCH_SIZE ?? 500);

/** Status employee yang ikut digaji. */
export const ELIGIBLE_STATUS = 'ACTIVE';

export const RULES = {
  workingDaysPerMonth: 22, // potongan alpha = gaji / 22 per hari
  overtimeMonthlyDivisor: 173, // upah lembur per jam = gaji / 173
  overtimeMultiplier: 1.5, 
  tripDailyAllowance: 300_000, // tunjangan dinas per hari
  healthInsuranceEmployeeRate: 0.01, // BPJS Kesehatan porsi karyawan 1%
  healthInsuranceSalaryCap: 12_000_000, // batas atas gaji dasar iuran
} as const;

export const COMPONENT = {
  attendance: 'Potongan Absensi (Alpha)',
  businessTrip: 'Tunjangan Perjalanan Dinas',
  overtime: 'Lembur',
  healthInsurance: 'Iuran BPJS Kesehatan',
} as const;

// code = saga.task_definitions.task_code (dari katalog), job = nama job BullMQ
export const TASK = {
  calcAttendance: { code: C.CALCULATE_ATTENDANCE, job: 'calc-attendance' },
  calcBusinessTrip: { code: C.CALCULATE_BUSINESS_TRIP, job: 'calc-business-trip' },
  calcOvertime: { code: C.CALCULATE_OVERTIME, job: 'calc-overtime' },
  calcHealthInsurance: { code: C.CALCULATE_HEALTH_INSURANCE, job: 'calc-health-insurance' },
  generatePayroll: { code: C.GENERATE_PAYROLL_EMPLOYEE, job: 'generate-payroll' },
} as const;

/** 4 task hitung — independen satu sama lain, jalan paralel per batch. */
export const CALC_TASKS = [TASK.calcAttendance, TASK.calcBusinessTrip, TASK.calcOvertime, TASK.calcHealthInsurance] as const;

/** Task yang dikerjakan worker. Task lain (approval, kliring, dst) diurus saga module. */
export const GENERATE_TASK_CODES: ReadonlySet<string> = new Set([...CALC_TASKS, TASK.generatePayroll].map((t) => t.code));