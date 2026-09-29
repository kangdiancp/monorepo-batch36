import { pgTable, pgSchema, serial, varchar, foreignKey, char, integer, numeric, index, unique, check, date, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const hr = pgSchema("hr");


export const regionsInHr = hr.table("regions", {
	regionId: serial("region_id").primaryKey().notNull(),
	regionName: varchar("region_name", { length: 25 }),
});

export const countriesInHr = hr.table("countries", {
	countryId: char("country_id", { length: 2 }).primaryKey().notNull(),
	countryName: varchar("country_name", { length: 40 }),
	regionId: integer("region_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsInHr.regionId],
			name: "fk_countries_region"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const locationsInHr = hr.table("locations", {
	locationId: serial("location_id").primaryKey().notNull(),
	streetAddress: varchar("street_address", { length: 40 }),
	postalCode: varchar("postal_code", { length: 12 }),
	city: varchar({ length: 30 }).notNull(),
	stateProvince: varchar("state_province", { length: 25 }),
	countryId: char("country_id", { length: 2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.countryId],
			foreignColumns: [countriesInHr.countryId],
			name: "fk_locations_country"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const departmentsInHr = hr.table("departments", {
	departmentId: serial("department_id").primaryKey().notNull(),
	departmentName: varchar("department_name", { length: 30 }).notNull(),
	locationId: integer("location_id"),
}, (table) => [
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locationsInHr.locationId],
			name: "fk_departments_location"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const jobsInHr = hr.table("jobs", {
	jobId: serial("job_id").primaryKey().notNull(),
	jobTitle: varchar("job_title", { length: 35 }).notNull(),
	minSalary: numeric("min_salary", { precision: 8, scale:  2 }),
	maxSalary: numeric("max_salary", { precision: 8, scale:  2 }),
});

export const employeesInHr = hr.table("employees", {
	employeeId: serial("employee_id").primaryKey().notNull(),
	firstName: varchar("first_name", { length: 20 }),
	lastName: varchar("last_name", { length: 25 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	hireDate: date("hire_date").notNull(),
	jobId: integer("job_id").notNull(),
	salary: numeric({ precision: 8, scale:  2 }).notNull(),
	managerId: integer("manager_id"),
	departmentId: integer("department_id"),
	employmentStatus: varchar("employment_status", { length: 20 }).default('ACTIVE').notNull(),
	employmentType: varchar("employment_type", { length: 20 }).default('PERMANENT').notNull(),
	terminationDate: date("termination_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_employees_dept_status").using("btree", table.departmentId.asc().nullsLast().op("text_ops"), table.employmentStatus.asc().nullsLast().op("int4_ops"), table.employeeId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobsInHr.jobId],
			name: "fk_employees_job"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentsInHr.departmentId],
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

export const employeeBankAccountsInHr = hr.table("employee_bank_accounts", {
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
			foreignColumns: [employeesInHr.employeeId],
			name: "fk_employee_bank_accounts_employee"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const dependentsInHr = hr.table("dependents", {
	dependentId: serial("dependent_id").primaryKey().notNull(),
	firstName: varchar("first_name", { length: 50 }).notNull(),
	lastName: varchar("last_name", { length: 50 }).notNull(),
	relationship: varchar({ length: 25 }).notNull(),
	employeeId: integer("employee_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employeesInHr.employeeId],
			name: "fk_dependents_emp"
		}).onUpdate("cascade").onDelete("cascade"),
]);
