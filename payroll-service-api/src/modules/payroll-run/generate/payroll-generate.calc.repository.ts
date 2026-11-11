import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../../db';
import type { PayrollRunRow } from '../payroll-run.types';
import { COMPONENT, ELIGIBLE_STATUS, RULES } from './payroll-generate.config';



export interface BatchRange {
  from_id: number;
  to_id: number;
  size: number;
}

export interface BatchScope {
  runId: string;
  fromId: number;
  toId: number;
  periodMonth: number;
  periodYear: number;
}

const rowCount = (r: { rowCount?: number | null }) => r.rowCount ?? 0;

function periodBounds(month: number, year: number): { start: string; endExclusive: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${year}-${pad(month)}-01`,
    endExclusive: month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`,
  };
}

function eligible(deptId: number | null): SQL {
  return sql`e.employment_status = ${ELIGIBLE_STATUS} AND (${deptId}::int IS NULL OR e.department_id = ${deptId}::int)`;
}


export async function countConflictingHistory(run: PayrollRunRow): Promise<number> {
  const res = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM fin.payroll_history ph
    JOIN hr.employees e ON e.employee_id = ph.employee_id
    WHERE ph.period_month = ${run.period_month}::smallint
      AND ph.period_year = ${run.period_year}::int
      AND ph.run_id IS DISTINCT FROM ${run.run_id}::uuid
      AND ${eligible(run.department_id)}
  `);
  return Number((res.rows[0] as { n: number }).n);
}

/** Hapus payroll_history  yg berstatus='Draft', misal untuk payroll-run untuk test dulu */
export async function removeStaleDraftRows(run: PayrollRunRow): Promise<void> {
  await db.execute(sql`
    DELETE FROM fin.payroll_history ph
    WHERE ph.run_id = ${run.run_id}::uuid
      AND ph.status = 'Draft'
      AND NOT EXISTS (
        SELECT 1 FROM hr.employees e
        WHERE e.employee_id = ph.employee_id AND ${eligible(run.department_id)}
      )
  `);
}


export async function upsertHistoryRows(run: PayrollRunRow): Promise<number> {
  const res = await db.execute(sql`
    INSERT INTO fin.payroll_history AS ph
      (employee_id, run_id, period_month, period_year, base_salary, total_allowance, total_deduction, net_salary, status)
    SELECT e.employee_id, ${run.run_id}::uuid, ${run.period_month}::smallint, ${run.period_year}::int,
           e.salary, 0, 0, e.salary, 'Draft'
    FROM hr.employees e
    WHERE ${eligible(run.department_id)}
    ON CONFLICT (employee_id, period_month, period_year) DO UPDATE
      SET base_salary = EXCLUDED.base_salary, total_allowance = 0, total_deduction = 0,
          net_salary = EXCLUDED.base_salary, status = 'Draft'
      WHERE ph.run_id = EXCLUDED.run_id
  `);
  return rowCount(res);
}


export async function findBatches(runId: string, batchSize: number): Promise<BatchRange[]> {
  const res = await db.execute(sql`
    SELECT MIN(employee_id)::int AS from_id, MAX(employee_id)::int AS to_id, COUNT(*)::int AS size
    FROM (
      SELECT employee_id, (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) / ${batchSize}::int AS bucket
      FROM fin.payroll_history
      WHERE run_id = ${runId}::uuid
    ) t
    GROUP BY bucket
    ORDER BY bucket
  `);
  return res.rows as unknown as BatchRange[];
}

// functin dibawah mulai calculate

/** Ganti 1 komponen payroll_details untuk seluruh employee di batch (delete + insert, idempotent). */
async function replaceComponent(
  s: BatchScope,
  name: string,
  type: 'Earning' | 'Deduction',
  select: SQL, // SELECT payroll_id, amount, description
): Promise<number> {
  const res = await db.execute(sql`
    WITH del AS (
      DELETE FROM fin.payroll_details d
      USING fin.payroll_history ph
      WHERE d.payroll_id = ph.payroll_id
        AND ph.run_id = ${s.runId}::uuid
        AND ph.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int
        AND d.component_name = ${name}::varchar
    )
    INSERT INTO fin.payroll_details (payroll_id, component_name, amount, component_type, description)
    SELECT x.payroll_id, ${name}::varchar, x.amount, ${type}::varchar, x.description
    FROM (${select}) x
    WHERE x.amount > 0
  `);
  return rowCount(res);
}

export async function calcAttendance(s: BatchScope): Promise<number> {
  const { start, endExclusive } = periodBounds(s.periodMonth, s.periodYear);
  return replaceComponent(
    s,
    COMPONENT.attendance,
    'Deduction',
    sql`
      SELECT ph.payroll_id,
             ROUND(ph.base_salary / ${RULES.workingDaysPerMonth}::numeric * a.alpha_days, 2) AS amount,
             (a.alpha_days || ' hari alpha')::varchar AS description
      FROM fin.payroll_history ph
      JOIN (
        SELECT employee_id, COUNT(*) AS alpha_days
        FROM fin.attendances
        WHERE attendance_date >= ${start}::date AND attendance_date < ${endExclusive}::date
          AND status = 'Alpha'
          AND employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int
        GROUP BY employee_id
      ) a ON a.employee_id = ph.employee_id
      WHERE ph.run_id = ${s.runId}::uuid AND ph.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int`,
  );
}

export async function calcBusinessTrip(s: BatchScope): Promise<number> {
  const { start, endExclusive } = periodBounds(s.periodMonth, s.periodYear);
  return replaceComponent(
    s,
    COMPONENT.businessTrip,
    'Earning',
    sql`
      SELECT ph.payroll_id,
             t.days * ${RULES.tripDailyAllowance}::numeric AS amount,
             (t.days || ' hari dinas')::varchar AS description
      FROM fin.payroll_history ph
      JOIN (
        SELECT employee_id,
               SUM(GREATEST(0, LEAST(end_date, ${endExclusive}::date - 1) - GREATEST(start_date, ${start}::date) + 1)) AS days
        FROM fin.business_trip
        WHERE status IN ('Ongoing', 'Completed')
          AND start_date < ${endExclusive}::date AND end_date >= ${start}::date
          AND employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int
        GROUP BY employee_id
      ) t ON t.employee_id = ph.employee_id
      WHERE ph.run_id = ${s.runId}::uuid AND ph.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int`,
  );
}

export async function calcOvertime(s: BatchScope): Promise<number> {
  const { start, endExclusive } = periodBounds(s.periodMonth, s.periodYear);
  return replaceComponent(
    s,
    COMPONENT.overtime,
    'Earning',
    sql`
      SELECT ph.payroll_id,
             ROUND(ph.base_salary / ${RULES.overtimeMonthlyDivisor}::numeric * o.total_hours * ${RULES.overtimeMultiplier}::numeric, 2) AS amount,
             (o.total_hours || ' jam lembur')::varchar AS description
      FROM fin.payroll_history ph
      JOIN (
        SELECT employee_id, SUM(hours) AS total_hours
        FROM fin.overtime
        WHERE overtime_date >= ${start}::date AND overtime_date < ${endExclusive}::date
          AND status = 'Approved'
          AND employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int
        GROUP BY employee_id
      ) o ON o.employee_id = ph.employee_id
      WHERE ph.run_id = ${s.runId}::uuid AND ph.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int`,
  );
}

export async function calcHealthInsurance(s: BatchScope): Promise<number> {
  return replaceComponent(
    s,
    COMPONENT.healthInsurance,
    'Deduction',
    sql`
      SELECT ph.payroll_id,
             ROUND(LEAST(ph.base_salary, ${RULES.healthInsuranceSalaryCap}::numeric) * ${RULES.healthInsuranceEmployeeRate}::numeric, 2) AS amount,
             'BPJS Kesehatan porsi karyawan'::varchar AS description
      FROM fin.payroll_history ph
      WHERE ph.run_id = ${s.runId}::uuid AND ph.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int`,
  );
}

/** Jumlahkan komponen -> total_allowance / total_deduction / net_salary per employee. */
export async function generatePayroll(s: BatchScope): Promise<number> {
  const res = await db.execute(sql`
    UPDATE fin.payroll_history ph
    SET total_allowance = COALESCE(c.earning, 0),
        total_deduction = COALESCE(c.deduction, 0),
        net_salary = ph.base_salary + COALESCE(c.earning, 0) - COALESCE(c.deduction, 0)
    FROM (
      SELECT h.payroll_id,
             SUM(d.amount) FILTER (WHERE d.component_type = 'Earning') AS earning,
             SUM(d.amount) FILTER (WHERE d.component_type = 'Deduction') AS deduction
      FROM fin.payroll_history h
      LEFT JOIN fin.payroll_details d ON d.payroll_id = h.payroll_id
      WHERE h.run_id = ${s.runId}::uuid AND h.employee_id BETWEEN ${s.fromId}::int AND ${s.toId}::int
      GROUP BY h.payroll_id
    ) c
    WHERE ph.payroll_id = c.payroll_id
  `);
  return rowCount(res);
}

// FINALIZE

/** Total run + PROCESSING -> REVIEW. Guard saga_id supaya job generasi lama tidak menimpa. */
export async function finalizeRunTotals(runId: string, sagaId: string): Promise<boolean> {
  const res = await db.execute(sql`
    UPDATE fin.payroll_runs r
    SET status = 'REVIEW',
        completed_at = CURRENT_TIMESTAMP,
        total_employees = t.n,
        total_gross = t.gross,
        total_deduction = t.ded,
        total_net = t.net
    FROM (
      SELECT COUNT(*)::int AS n,
             COALESCE(SUM(base_salary + total_allowance), 0) AS gross,
             COALESCE(SUM(total_deduction), 0) AS ded,
             COALESCE(SUM(net_salary), 0) AS net
      FROM fin.payroll_history
      WHERE run_id = ${runId}::uuid
    ) t
    WHERE r.run_id = ${runId}::uuid AND r.status = 'PROCESSING' AND r.saga_id = ${sagaId}::uuid
  `);
  return rowCount(res) > 0;
}