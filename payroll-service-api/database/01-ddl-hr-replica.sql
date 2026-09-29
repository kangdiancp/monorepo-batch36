CREATE SCHEMA IF NOT EXISTS hr;

CREATE TABLE hr.departments (
    department_id INTEGER PRIMARY KEY, 
    department_name VARCHAR(30) NOT NULL
);

CREATE TABLE hr.employees (
    employee_id INTEGER PRIMARY KEY,
    first_name VARCHAR(20),
    last_name VARCHAR(25) NOT NULL,
    email VARCHAR(100) NOT NULL,
    department_id INTEGER,
    salary NUMERIC(8, 2) NOT NULL,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    employment_type VARCHAR(20) NOT NULL DEFAULT 'PERMANENT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_dept FOREIGN KEY (department_id)
        REFERENCES hr.departments (department_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_employees_status CHECK (
        employment_status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED')
    ),
    CONSTRAINT ck_employees_type CHECK (
        employment_type IN ('PERMANENT', 'CONTRACT', 'INTERN', 'PROBATION')
    )
);

CREATE INDEX idx_employees_department ON hr.employees (department_id);
