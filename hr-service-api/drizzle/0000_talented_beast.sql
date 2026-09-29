CREATE SCHEMA "hr";
--> statement-breakpoint
CREATE TABLE "hr"."countries" (
	"country_id" char(2) PRIMARY KEY NOT NULL,
	"country_name" varchar(40),
	"region_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr"."departments" (
	"department_id" serial PRIMARY KEY NOT NULL,
	"department_name" varchar(30) NOT NULL,
	"location_id" integer
);
--> statement-breakpoint
CREATE TABLE "hr"."dependents" (
	"dependent_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"relationship" varchar(25) NOT NULL,
	"employee_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr"."employee_bank_accounts" (
	"bank_account_id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"bank_name" varchar(50) NOT NULL,
	"bank_code" varchar(10),
	"account_number" varchar(34) NOT NULL,
	"account_holder_name" varchar(100) NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr"."employees" (
	"employee_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(20),
	"last_name" varchar(25) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone_number" varchar(20),
	"hire_date" date NOT NULL,
	"job_id" integer NOT NULL,
	"salary" numeric(8, 2) NOT NULL,
	"manager_id" integer,
	"department_id" integer,
	"employment_status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"employment_type" varchar(20) DEFAULT 'PERMANENT' NOT NULL,
	"termination_date" date,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_employees_email" UNIQUE("email"),
	CONSTRAINT "ck_employees_salary" CHECK (salary > (0)::numeric),
	CONSTRAINT "ck_employees_status" CHECK ((employment_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ON_LEAVE'::character varying, 'SUSPENDED'::character varying, 'RESIGNED'::character varying, 'TERMINATED'::character varying])::text[])),
	CONSTRAINT "ck_employees_type" CHECK ((employment_type)::text = ANY ((ARRAY['PERMANENT'::character varying, 'CONTRACT'::character varying, 'INTERN'::character varying, 'PROBATION'::character varying])::text[])),
	CONSTRAINT "ck_employees_termination_date" CHECK ((termination_date IS NULL) OR (termination_date >= hire_date))
);
--> statement-breakpoint
CREATE TABLE "hr"."jobs" (
	"job_id" serial PRIMARY KEY NOT NULL,
	"job_title" varchar(35) NOT NULL,
	"min_salary" numeric(8, 2),
	"max_salary" numeric(8, 2)
);
--> statement-breakpoint
CREATE TABLE "hr"."locations" (
	"location_id" serial PRIMARY KEY NOT NULL,
	"street_address" varchar(40),
	"postal_code" varchar(12),
	"city" varchar(30) NOT NULL,
	"state_province" varchar(25),
	"country_id" char(2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr"."regions" (
	"region_id" serial PRIMARY KEY NOT NULL,
	"region_name" varchar(25)
);
--> statement-breakpoint
ALTER TABLE "hr"."countries" ADD CONSTRAINT "fk_countries_region" FOREIGN KEY ("region_id") REFERENCES "hr"."regions"("region_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."departments" ADD CONSTRAINT "fk_departments_location" FOREIGN KEY ("location_id") REFERENCES "hr"."locations"("location_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."dependents" ADD CONSTRAINT "fk_dependents_emp" FOREIGN KEY ("employee_id") REFERENCES "hr"."employees"("employee_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."employee_bank_accounts" ADD CONSTRAINT "fk_employee_bank_accounts_employee" FOREIGN KEY ("employee_id") REFERENCES "hr"."employees"("employee_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."employees" ADD CONSTRAINT "fk_employees_job" FOREIGN KEY ("job_id") REFERENCES "hr"."jobs"("job_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."employees" ADD CONSTRAINT "fk_employees_dept" FOREIGN KEY ("department_id") REFERENCES "hr"."departments"("department_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."employees" ADD CONSTRAINT "fk_employees_manager" FOREIGN KEY ("manager_id") REFERENCES "hr"."employees"("employee_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hr"."locations" ADD CONSTRAINT "fk_locations_country" FOREIGN KEY ("country_id") REFERENCES "hr"."countries"("country_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employee_bank_accounts_one_primary" ON "hr"."employee_bank_accounts" USING btree ("employee_id" int4_ops) WHERE (is_primary = true);--> statement-breakpoint
CREATE INDEX "idx_employees_dept_status" ON "hr"."employees" USING btree ("department_id" int4_ops,"employment_status" text_ops,"employee_id" int4_ops);