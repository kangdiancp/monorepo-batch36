import { employeeTypeDefs } from '../modules/employees/graphql/employees.typedefs'
import { employeeResolvers } from '../modules/employees/graphql/employees.resolvers'
import { departmentTypeDefs } from '../modules/departments/graphql/department.typedefs'
import { departmentResolvers } from '../modules/departments/graphql/departments.resolvers'
import { mergeResolvers, mergeTypeDefs  } from '@graphql-tools/merge'
import { print } from 'graphql'

const mergedTypeDefs = mergeTypeDefs([employeeTypeDefs,departmentTypeDefs])

export const schema = print(mergedTypeDefs)

export const resolvers = mergeResolvers([employeeResolvers,departmentResolvers])