// modules/departments/graphql/departments.typedefs.ts
export const departmentTypeDefs = `
  extend type Department {
    employees: [Employee!]!
  }

  type DepartmentConnection {
    items: [Department!]!
    pagination: Pagination!
  }

  input DepartmentFilterInput {
    search: String
    locationId: Int
  }

  input CreateDepartmentInput {
    departmentName: String!
    locationId: Int
  }

  input UpdateDepartmentInput {
    departmentName: String
    locationId: Int
  }

  extend type Query {
    departments(page: Int = 1, limit: Int = 20, filter: DepartmentFilterInput): DepartmentConnection!
    department(id: Int!): Department
  }

  extend type Mutation {
    createDepartment(input: CreateDepartmentInput!): Department!
    updateDepartment(id: Int!, input: UpdateDepartmentInput!): Department!
    deleteDepartment(id: Int!): Boolean!
  }
`