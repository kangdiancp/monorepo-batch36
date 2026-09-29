/**
 * Seed script untuk load testing — generate data dummy dalam jumlah besar.
 *
 * Warning: jangan gunakan di database producttion
 * delete dulu data existing
 *
 * Cara jalankan:
 *   npm i -D @faker-js/faker
 *   tsx scripts/seed.ts                    # default 50.000 employees
 *   EMPLOYEE_COUNT=100000 tsx scripts/seed.ts   # custom jumlah
 */

import { faker } from '@faker-js/faker';
import { db } from '../src/db'; 
import { regions, countries, locations, departments, jobs, employees } from '../src/db/schema'; 

const EMPLOYEE_COUNT = Number(process.env.EMPLOYEE_COUNT ?? 100_000); //ubah ke 100.000
const BATCH_SIZE = 1000; // insert per-batch, hindari limit parameter Postgres (~65535 params/query)
const MANAGER_POOL_SIZE = Math.min(200, Math.floor(EMPLOYEE_COUNT * 0.02)); // ~2%  employee kita jadikan manager

// ---------------------------------------------------------------------------
// pastikan hanya running di dev, bukan production, kita protek disini jangan lari ke production
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Seed script diblokir di NODE_ENV=production. Set ALLOW_SEED=true kalau memang sengaja.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Master data 
// Country code (char(2), PRIMARY KEY) 
// ---------------------------------------------------------------------------

const REGION_NAMES = ['Asia Pacific', 'Americas', 'Europe', 'Middle East & Africa'];

const COUNTRIES_BY_REGION = [
  { countryId: 'ID', countryName: 'Indonesia' },
  { countryId: 'SG', countryName: 'Singapore' },
  { countryId: 'MY', countryName: 'Malaysia' },
  { countryId: 'US', countryName: 'United States' },
  { countryId: 'CA', countryName: 'Canada' },
  { countryId: 'BR', countryName: 'Brazil' },
  { countryId: 'GB', countryName: 'United Kingdom' },
  { countryId: 'DE', countryName: 'Germany' },
  { countryId: 'AE', countryName: 'United Arab Emirates' },
  { countryId: 'ZA', countryName: 'South Africa' },
];

const JOB_TITLES = [
  { jobTitle: 'Software Engineer', minSalary: '6000000.00', maxSalary: '25000000.00' },
  { jobTitle: 'Product Manager', minSalary: '8000000.00', maxSalary: '30000000.00' },
  { jobTitle: 'HR Specialist', minSalary: '5000000.00', maxSalary: '15000000.00' },
  { jobTitle: 'Sales Executive', minSalary: '4500000.00', maxSalary: '20000000.00' },
  { jobTitle: 'Financial Analyst', minSalary: '5500000.00', maxSalary: '18000000.00' },
  { jobTitle: 'Marketing Specialist', minSalary: '5000000.00', maxSalary: '16000000.00' },
  { jobTitle: 'Data Analyst', minSalary: '6000000.00', maxSalary: '22000000.00' },
  { jobTitle: 'Customer Support', minSalary: '4000000.00', maxSalary: '10000000.00' },
  { jobTitle: 'Operations Manager', minSalary: '9000000.00', maxSalary: '28000000.00' },
  { jobTitle: 'Legal Counsel', minSalary: '10000000.00', maxSalary: '35000000.00' },
];

const EMPLOYMENT_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED'] as const;
const EMPLOYMENT_TYPES = ['PERMANENT', 'PERMANENT', 'PERMANENT', 'CONTRACT', 'INTERN', 'PROBATION'] as const;
// kita set mayoritas data employee berstatus aktif/permanent.

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function seedMasterData() {
  console.log('Seeding master data (regions, countries, locations, departments, jobs)...');

  const insertedRegions = await db.insert(regions).values(
    REGION_NAMES.map((regionName) => ({ regionName })),
  ).returning();

  const insertedCountries = await db.insert(countries).values(
    COUNTRIES_BY_REGION.map((c, i) => ({
      ...c,
      regionId: insertedRegions[i % insertedRegions.length]!.regionId,
    })),
  ).returning();

  const insertedLocations = await db.insert(locations).values(
    Array.from({ length: 20 }, () => {
      const country = pickRandom(insertedCountries);
      return {
        streetAddress: faker.location.streetAddress(),
        postalCode: faker.location.zipCode(),
        city: faker.location.city(),
        stateProvince: faker.location.state(),
        countryId: country.countryId,
      };
    }),
  ).returning();

  const insertedDepartments = await db.insert(departments).values(
    ['Engineering', 'Product', 'Human Resources', 'Sales', 'Finance', 'Marketing', 'Data & Analytics', 'Customer Success', 'Operations', 'Legal'].map(
      (departmentName) => ({
        departmentName,
        locationId: pickRandom(insertedLocations).locationId,
      }),
    ),
  ).returning();

  const insertedJobs = await db.insert(jobs).values(JOB_TITLES).returning();

  console.log(
    `Master data selesai: ${insertedRegions.length} regions, ${insertedCountries.length} countries, ` +
    `${insertedLocations.length} locations, ${insertedDepartments.length} departments, ${insertedJobs.length} jobs.`,
  );

  return { departments: insertedDepartments, jobs: insertedJobs };
}

function generateEmployeePayload(
  departmentPool: { departmentId: number }[],
  jobPool: { jobId: number }[],
  managerPool: number[],
  index: number,
) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const hireDate = faker.date.past({ years: 8 });
  const isTerminated = Math.random() < 0.1; // 10% employee sudah resign/terminated

  return {
    firstName,
    lastName,
    // include index agar unique (uq_employees_email) untuk 50.000.
    email: `${firstName}.${lastName}.${index}@example.com`.toLowerCase(),
    phoneNumber: faker.phone.number(),
    hireDate: hireDate.toISOString().split('T')[0]!, // format 'date' (YYYY-MM-DD)
    jobId: pickRandom(jobPool).jobId,
    salary: faker.number.float({ min: 4_000_000, max: 35_000_000, fractionDigits: 2 }).toFixed(2),
    managerId: managerPool.length > 0 && Math.random() < 0.85 ? pickRandom(managerPool) : null,
    departmentId: Math.random() < 0.95 ? pickRandom(departmentPool).departmentId : null,
    employmentStatus: isTerminated ? pickRandom(['RESIGNED', 'TERMINATED'] as const) : pickRandom(EMPLOYMENT_STATUSES),
    employmentType: pickRandom(EMPLOYMENT_TYPES),
    terminationDate: isTerminated
      ? faker.date.between({ from: hireDate, to: new Date() }).toISOString().split('T')[0]!
      : null,
  };
}

async function seedEmployees(departmentPool: { departmentId: number }[], jobPool: { jobId: number }[]) {
  console.log(`Seeding ${EMPLOYEE_COUNT} employees (batch size ${BATCH_SIZE})...`);

  console.log(`  Fase 1: seed ${MANAGER_POOL_SIZE} manager pool...`);
  const managerPayloads = Array.from({ length: MANAGER_POOL_SIZE }, (_, i) =>
    generateEmployeePayload(departmentPool, jobPool, [], i),
  );
  const insertedManagers = await db.insert(employees).values(managerPayloads).returning({ employeeId: employees.employeeId });
  const managerIds = insertedManagers.map((m) => m.employeeId);


  const remaining = EMPLOYEE_COUNT - MANAGER_POOL_SIZE;
  let inserted = 0;

  for (let offset = 0; offset < remaining; offset += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, remaining - offset);
    const batch = Array.from({ length: batchSize }, (_, i) =>
      generateEmployeePayload(departmentPool, jobPool, managerIds, MANAGER_POOL_SIZE + offset + i),
    );

    await db.insert(employees).values(batch);
    inserted += batchSize;

    if (inserted % 5000 === 0 || inserted === remaining) {
      console.log(`  ...${inserted + MANAGER_POOL_SIZE}/${EMPLOYEE_COUNT} employees ter-insert`);
    }
  }

  console.log(`Selesai! Total ${EMPLOYEE_COUNT} employees ter-seed.`);
}

async function main() {
  const start = Date.now();

  const { departments: departmentPool, jobs: jobPool } = await seedMasterData();
  await seedEmployees(departmentPool, jobPool);

  const durationSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nSeed selesai dalam ${durationSec} detik.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});