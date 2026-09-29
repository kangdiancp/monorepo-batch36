import * as departmentService from '../departments.service'
import { mapCreateInput, mapUpdateInput } from './department.mappers'
import { toGraphQLError } from '../../../common/graphql/error-mapper'
import type { Resolvers } from '../../../graphql/generated/resolvers-types'
import type { ListDepartmentQuery } from '../departments.schema'

export const departmentResolvers: Resolvers = {
  Query: {
    departments: async (_parent, args) => {
      try {
        const { items, pagination } = await departmentService.listDepartments({
          page: args.page,
          limit: args.limit,
          ...args.filter,
        } as ListDepartmentQuery)
        return { items, pagination }
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
    department: async (_parent, args) => {
      try {
        return await departmentService.getDepartmentById(args.id)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  },
  Mutation: {
    createDepartment: async (_parent, args) => {
      try {
        return await departmentService.createDepartment(mapCreateInput(args.input))
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
    updateDepartment: async (_parent, args) => {
      try {
        return await departmentService.updateDepartment(args.id, mapUpdateInput(args.input))
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
    deleteDepartment: async (_parent, args) => {
      try {
        await departmentService.deleteDepartment(args.id)
        return true
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  },
  Department: {
    employees: (parent, _args, ctx) => ctx.loaders.employeesByDepartmentLoader.load(parent.departmentId),
  },
}