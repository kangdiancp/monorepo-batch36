import * as employeeService from '../employees.service'
import { mapCreateInput, mapUpdateInput } from './employees.mappers'
import { toGraphQLError } from '../../../common/graphql/error-mapper'
import type { Resolvers } from '../../../graphql/generated/resolvers-types'
import type { ListEmployeeQuery } from '../employees.schema'

export const employeeResolvers: Resolvers = {
  Query: {
    employees: async (_parent, args) => {
      try {
        const { items, pagination } = await employeeService.listEmployees({
          page: args.page,
          limit: args.limit,
          ...args.filter,
        } as ListEmployeeQuery)
        return { items, pagination }
      } catch (err) {
        throw toGraphQLError(err)
      }
    },

    employee: async (_parent, args) => {
      try {
        return await employeeService.getEmployeeById(args.id)
      } catch (err) {
        // ApiError.notFound -> GraphQLError { extensions: { code: 'NOT_FOUND' } }
        throw toGraphQLError(err)
      }
    },
  },

  Mutation: {
    createEmployee: async (_parent, args) => {
      try {
        return await employeeService.createEmployee(mapCreateInput(args.input))
      } catch (err) {
        throw toGraphQLError(err)
      }
    },

    updateEmployee: async (_parent, args) => {
      try {
        return await employeeService.updateEmployee(args.id, mapUpdateInput(args.input))
      } catch (err) {
        throw toGraphQLError(err)
      }
    },

    deleteEmployee: async (_parent, args) => {
      try {
        await employeeService.deleteEmployee(args.id)
        return true
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  },


  Employee: {
    job: (parent, _args, ctx) => ctx.loaders.jobLoader.load(parent.jobId),

    department: (parent, _args, ctx) =>
      parent.departmentId ? ctx.loaders.departmentLoader.load(parent.departmentId) : null,

    manager: (parent, _args, ctx) =>
      parent.managerId ? ctx.loaders.employeeLoader.load(parent.managerId) : null,

    directReports: (parent, _args, ctx) => ctx.loaders.directReportsLoader.load(parent.employeeId),
  },
}