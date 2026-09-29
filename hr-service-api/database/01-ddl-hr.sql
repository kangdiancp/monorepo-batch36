CREATE SCHEMA IF NOT EXISTS hr;

-- Regions
CREATE TABLE hr.regions (
    region_id SERIAL PRIMARY KEY,
    region_name VARCHAR(25)
);

-- Countries
CREATE TABLE hr.countries (
    country_id CHAR(2) PRIMARY KEY,
    country_name VARCHAR(40),
    region_id INTEGER NOT NULL,
    CONSTRAINT fk_countries_region FOREIGN KEY (region_id) 
        REFERENCES hr.regions (region_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Locations
CREATE TABLE hr.locations (
    location_id SERIAL PRIMARY KEY,
    street_address VARCHAR(40),
    postal_code VARCHAR(12),
    city VARCHAR(30) NOT NULL,
    state_province VARCHAR(25),
    country_id CHAR(2) NOT NULL,
    CONSTRAINT fk_locations_country FOREIGN KEY (country_id) 
        REFERENCES hr.countries (country_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Departments
CREATE TABLE hr.departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(30) NOT NULL,
    location_id INTEGER,
    CONSTRAINT fk_departments_location FOREIGN KEY (location_id) 
        REFERENCES hr.locations (location_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Jobs
CREATE TABLE hr.jobs (
    job_id SERIAL PRIMARY KEY,
    job_title VARCHAR(35) NOT NULL,
    min_salary NUMERIC(8, 2),
    max_salary NUMERIC(8, 2)
);

-- Fungsi generik: auto-update kolom updated_at tiap kali row di-UPDATE.
-- Dipakai lewat trigger di tabel yang punya kolom updated_at (employees, employee_bank_accounts).
CREATE OR REPLACE FUNCTION hr.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Employees
CREATE TABLE hr.employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(20),
    last_name VARCHAR(25) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    hire_date DATE NOT NULL,
    job_id INTEGER NOT NULL,
    salary NUMERIC(8, 2) NOT NULL,
    manager_id INTEGER,
    department_id INTEGER,
    -- status kepegawaian, wajib dicek sebelum generate payroll_runs
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED'
    employment_type VARCHAR(20) NOT NULL DEFAULT 'PERMANENT',
    -- 'PERMANENT' | 'CONTRACT' | 'INTERN' | 'PROBATION'
    termination_date DATE, -- tanggal resign/berhenti, untuk prorate gaji terakhir
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_email UNIQUE (email),
    CONSTRAINT ck_employees_salary CHECK (salary > 0),
    CONSTRAINT ck_employees_status CHECK (
        employment_status IN (
            'ACTIVE',
            'ON_LEAVE',
            'SUSPENDED',
            'RESIGNED',
            'TERMINATED'
        )
    ),
    CONSTRAINT ck_employees_type CHECK (
        employment_type IN ('PERMANENT', 'CONTRACT', 'INTERN', 'PROBATION')
    ),
    CONSTRAINT ck_employees_termination_date CHECK (
        termination_date IS NULL
        OR termination_date >= hire_date
    ),
    -- (RESTRICT/SET NULL), manager jangan cascade-hapus bawahan
    CONSTRAINT fk_employees_job FOREIGN KEY (job_id)
        REFERENCES hr.jobs (job_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_employees_dept FOREIGN KEY (department_id)
        REFERENCES hr.departments (department_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id)
        REFERENCES hr.employees (employee_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TRIGGER trg_employees_set_updated_at
    BEFORE UPDATE ON hr.employees
    FOR EACH ROW
    EXECUTE FUNCTION hr.set_updated_at();


CREATE INDEX idx_employees_dept_status ON hr.employees (department_id, employment_status, employee_id);


CREATE TABLE hr.employee_bank_accounts (
    bank_account_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    bank_code VARCHAR(10), 
    account_number VARCHAR(34) NOT NULL, -- 34 char cukup utk nomor rekening bank
    account_holder_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_bank_accounts_employee FOREIGN KEY (employee_id)
        REFERENCES hr.employees (employee_id) ON UPDATE CASCADE ON DELETE CASCADE
);


CREATE UNIQUE INDEX uq_employee_bank_accounts_one_primary
    ON hr.employee_bank_accounts (employee_id)
    WHERE is_primary = true;

CREATE TRIGGER trg_employee_bank_accounts_set_updated_at
    BEFORE UPDATE ON hr.employee_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION hr.set_updated_at();

-- Dependents
CREATE TABLE hr.dependents (
    dependent_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    relationship VARCHAR(25) NOT NULL,
    employee_id INTEGER NOT NULL,
    CONSTRAINT fk_dependents_emp FOREIGN KEY (employee_id) 
        REFERENCES hr.employees (employee_id) ON UPDATE CASCADE ON DELETE CASCADE
);
