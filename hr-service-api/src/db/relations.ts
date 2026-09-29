import { relations } from "drizzle-orm/relations";
import { regions, countries, locations, departments, jobs, employees, employeeBankAccounts, dependents } from "./schema";

export const countriesRelations = relations(countries, ({one, many}) => ({
	regions: one(regions, {
		fields: [countries.regionId],
		references: [regions.regionId]
	}),
	locationss: many(locations),
}));

export const regionsRelations = relations(regions, ({many}) => ({
	countriess: many(countries),
}));

export const locationsRelations = relations(locations, ({one, many}) => ({
	countries: one(countries, {
		fields: [locations.countryId],
		references: [countries.countryId]
	}),
	departmentss: many(departments),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	locations: one(locations, {
		fields: [departments.locationId],
		references: [locations.locationId]
	}),
	employeess: many(employees),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	jobs: one(jobs, {
		fields: [employees.jobId],
		references: [jobs.jobId]
	}),
	departments: one(departments, {
		fields: [employees.departmentId],
		references: [departments.departmentId]
	}),
	employees: one(employees, {
		fields: [employees.managerId],
		references: [employees.employeeId],
		relationName: "employees_managerId_employees_employeeId"
	}),
	employeess: many(employees, {
		relationName: "employees_managerId_employees_employeeId"
	}),
	employeeBankAccountss: many(employeeBankAccounts),
	dependentss: many(dependents),
}));

export const jobsRelations = relations(jobs, ({many}) => ({
	employeess: many(employees),
}));

export const employeeBankAccountsRelations = relations(employeeBankAccounts, ({one}) => ({
	employees: one(employees, {
		fields: [employeeBankAccounts.employeeId],
		references: [employees.employeeId]
	}),
}));

export const dependentsRelations = relations(dependents, ({one}) => ({
	employees: one(employees, {
		fields: [dependents.employeeId],
		references: [employees.employeeId]
	}),
}));