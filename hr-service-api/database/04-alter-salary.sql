ALTER TABLE hr.jobs 
ALTER COLUMN max_salary TYPE NUMERIC(15, 2);

delete from hr.dependents;
delete from hr.employees;
delete from hr.jobs;
delete from hr.departments;
delete from hr.locations;
delete from hr.countries;
delete from hr.regions;

ALTER TABLE hr.employees 
ALTER COLUMN salary TYPE NUMERIC(15, 2);

ALTER TABLE hr.employees 
ALTER COLUMN first_name TYPE varchar(25),
ALTER COLUMN email TYPE varchar(55),
ALTER COLUMN phone_number TYPE varchar(25),
ALTER COLUMN employment_status TYPE varchar(25),
ALTER COLUMN employment_type TYPE varchar(25);


ALTER TABLE hr.jobs 
ALTER COLUMN min_salary TYPE NUMERIC(15, 2),
ALTER COLUMN max_salary TYPE NUMERIC(15, 2);