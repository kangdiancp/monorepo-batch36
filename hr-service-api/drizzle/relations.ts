import { relations } from "drizzle-orm/relations";
import { regionsInHr, countriesInHr, locationsInHr, departmentsInHr, jobsInHr, employeesInHr, employeeBankAccountsInHr, dependentsInHr } from "./schema";

export const countriesInHrRelations = relations(countriesInHr, ({one, many}) => ({
	regionsInHr: one(regionsInHr, {
		fields: [countriesInHr.regionId],
		references: [regionsInHr.regionId]
	}),
	locationsInHrs: many(locationsInHr),
}));

export const regionsInHrRelations = relations(regionsInHr, ({many}) => ({
	countriesInHrs: many(countriesInHr),
}));

export const locationsInHrRelations = relations(locationsInHr, ({one, many}) => ({
	countriesInHr: one(countriesInHr, {
		fields: [locationsInHr.countryId],
		references: [countriesInHr.countryId]
	}),
	departmentsInHrs: many(departmentsInHr),
}));

export const departmentsInHrRelations = relations(departmentsInHr, ({one, many}) => ({
	locationsInHr: one(locationsInHr, {
		fields: [departmentsInHr.locationId],
		references: [locationsInHr.locationId]
	}),
	employeesInHrs: many(employeesInHr),
}));

export const employeesInHrRelations = relations(employeesInHr, ({one, many}) => ({
	jobsInHr: one(jobsInHr, {
		fields: [employeesInHr.jobId],
		references: [jobsInHr.jobId]
	}),
	departmentsInHr: one(departmentsInHr, {
		fields: [employeesInHr.departmentId],
		references: [departmentsInHr.departmentId]
	}),
	employeesInHr: one(employeesInHr, {
		fields: [employeesInHr.managerId],
		references: [employeesInHr.employeeId],
		relationName: "employeesInHr_managerId_employeesInHr_employeeId"
	}),
	employeesInHrs: many(employeesInHr, {
		relationName: "employeesInHr_managerId_employeesInHr_employeeId"
	}),
	employeeBankAccountsInHrs: many(employeeBankAccountsInHr),
	dependentsInHrs: many(dependentsInHr),
}));

export const jobsInHrRelations = relations(jobsInHr, ({many}) => ({
	employeesInHrs: many(employeesInHr),
}));

export const employeeBankAccountsInHrRelations = relations(employeeBankAccountsInHr, ({one}) => ({
	employeesInHr: one(employeesInHr, {
		fields: [employeeBankAccountsInHr.employeeId],
		references: [employeesInHr.employeeId]
	}),
}));

export const dependentsInHrRelations = relations(dependentsInHr, ({one}) => ({
	employeesInHr: one(employeesInHr, {
		fields: [dependentsInHr.employeeId],
		references: [employeesInHr.employeeId]
	}),
}));