import { pgSchema, serial, varchar, foreignKey, char, integer, numeric, index, unique, check, date, timestamp, uniqueIndex, boolean, uuid, bigint, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const hr = pgSchema("hr");


export const regions = hr.table("regions", {
	regionId: serial("region_id").primaryKey().notNull(),
	regionName: varchar("region_name", { length: 25 }),
});

export const countries = hr.table("countries", {
	countryId: char("country_id", { length: 2 }).primaryKey().notNull(),
	countryName: varchar("country_name", { length: 40 }),
	regionId: integer("region_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.regionId],
			name: "fk_countries_region"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const locations = hr.table("locations", {
	locationId: serial("location_id").primaryKey().notNull(),
	streetAddress: varchar("street_address", { length: 40 }),
	postalCode: varchar("postal_code", { length: 12 }),
	city: varchar({ length: 30 }).notNull(),
	stateProvince: varchar("state_province", { length: 25 }),
	countryId: char("country_id", { length: 2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.countryId],
			foreignColumns: [countries.countryId],
			name: "fk_locations_country"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const departments = hr.table("departments", {
	departmentId: serial("department_id").primaryKey().notNull(),
	departmentName: varchar("department_name", { length: 30 }).notNull(),
	locationId: integer("location_id"),
}, (table) => [
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.locationId],
			name: "fk_departments_location"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const jobs = hr.table("jobs", {
	jobId: serial("job_id").primaryKey().notNull(),
	jobTitle: varchar("job_title", { length: 35 }).notNull(),
	minSalary: numeric("min_salary", { precision: 8, scale:  2 }),
	maxSalary: numeric("max_salary", { precision: 8, scale:  2 }),
});

export const employees = hr.table("employees", {
	employeeId: serial("employee_id").primaryKey().notNull(),
	firstName: varchar("first_name", { length: 25 }),
	lastName: varchar("last_name", { length: 25 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 25 }),
	hireDate: date("hire_date").notNull(),
	jobId: integer("job_id").notNull(),
	salary: numeric({ precision: 15, scale:  2 }).notNull(),
	managerId: integer("manager_id"),
	departmentId: integer("department_id"),
	employmentStatus: varchar("employment_status", { length: 25 }).default('ACTIVE').notNull(),
	employmentType: varchar("employment_type", { length: 25 }).default('PERMANENT').notNull(),
	terminationDate: date("termination_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_employees_dept_status").using("btree", table.departmentId.asc().nullsLast().op("int4_ops"), table.employmentStatus.asc().nullsLast().op("text_ops"), table.employeeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.jobId],
			name: "fk_employees_job"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.departmentId],
			name: "fk_employees_dept"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [table.employeeId],
			name: "fk_employees_manager"
		}).onUpdate("cascade").onDelete("set null"),
	unique("uq_employees_email").on(table.email),
	check("ck_employees_salary", sql`salary > (0)::numeric`),
	check("ck_employees_status", sql`(employment_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ON_LEAVE'::character varying, 'SUSPENDED'::character varying, 'RESIGNED'::character varying, 'TERMINATED'::character varying])::text[])`),
	check("ck_employees_type", sql`(employment_type)::text = ANY ((ARRAY['PERMANENT'::character varying, 'CONTRACT'::character varying, 'INTERN'::character varying, 'PROBATION'::character varying])::text[])`),
	check("ck_employees_termination_date", sql`(termination_date IS NULL) OR (termination_date >= hire_date)`),
]);

export const employeeBankAccounts = hr.table("employee_bank_accounts", {
	bankAccountId: serial("bank_account_id").primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	bankName: varchar("bank_name", { length: 50 }).notNull(),
	bankCode: varchar("bank_code", { length: 10 }),
	accountNumber: varchar("account_number", { length: 34 }).notNull(),
	accountHolderName: varchar("account_holder_name", { length: 100 }).notNull(),
	isPrimary: boolean("is_primary").default(true).notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_employee_bank_accounts_one_primary").using("btree", table.employeeId.asc().nullsLast().op("int4_ops")).where(sql`(is_primary = true)`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "fk_employee_bank_accounts_employee"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const dependents = hr.table("dependents", {
	dependentId: serial("dependent_id").primaryKey().notNull(),
	firstName: varchar("first_name", { length: 50 }).notNull(),
	lastName: varchar("last_name", { length: 50 }).notNull(),
	relationship: varchar({ length: 25 }).notNull(),
	employeeId: integer("employee_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "fk_dependents_emp"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const employeeFiles = hr.table("employee_files", {
	fileId: uuid("file_id").defaultRandom().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	fileCategory: varchar("file_category", { length: 50 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileType: varchar("file_type", { length: 100 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
	storageProvider: varchar("storage_provider", { length: 30 }).default('LOCAL').notNull(),
	filePath: varchar("file_path", { length: 500 }).notNull(),
	providerFileId: varchar("provider_file_id", { length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	description: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_ef_emp_category").using("btree", table.employeeId.asc().nullsLast().op("int4_ops"), table.fileCategory.asc().nullsLast().op("text_ops")),
	index("idx_ef_employee_id").using("btree", table.employeeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "fk_ef_employee"
		}).onUpdate("cascade").onDelete("cascade"),
	check("ck_ef_storage_provider", sql`(storage_provider)::text = ANY ((ARRAY['LOCAL'::character varying, 'CLOUDINARY'::character varying, 'S3'::character varying, 'GCS'::character varying])::text[])`),
]);

// ============================================================================
// employeeEventsOutbox — BARU (transactional outbox pattern)
// Insert ke sini WAJIB dalam transaksi yang sama dengan insert/update/delete
// di tabel `employees` (lihat employees.repository.ts). Dibaca & dipublish ke
// Kafka oleh proses terpisah: src/workers/outbox-publisher.worker.ts.
//
// SENGAJA TANPA foreignKey ke employees.employeeId — event 'employee.terminated'
// harus tetap bisa tersimpan & terpublish walau row employee sudah dihapus
// permanen (hard delete) dalam transaksi yang sama.
// ============================================================================
export const employeeEventsOutbox = hr.table("employee_events_outbox", {
	outboxId: uuid("outbox_id").defaultRandom().primaryKey().notNull(),
	aggregateType: varchar("aggregate_type", { length: 50 }).default('EMPLOYEE').notNull(),
	aggregateId: integer("aggregate_id").notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(), // employee.created | employee.updated | employee.terminated
	payload: jsonb("payload").notNull(),
	status: varchar("status", { length: 20 }).default('PENDING').notNull(), // PENDING | PUBLISHED | FAILED
	retryCount: integer("retry_count").default(0).notNull(),
	errorMessage: varchar("error_message", { length: 1000 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
}, (table) => [
	index("idx_employee_outbox_pending").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")).where(sql`(status = 'PENDING'::character varying)`),
	check("ck_employee_outbox_status", sql`(status)::text = ANY ((ARRAY['PENDING'::character varying, 'PUBLISHED'::character varying, 'FAILED'::character varying])::text[])`),
]);