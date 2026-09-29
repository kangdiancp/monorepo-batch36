export const employeeTypeDefs = `
  enum EmploymentStatus {
    ACTIVE
    ON_LEAVE
    SUSPENDED
    RESIGNED
    TERMINATED
  }

  enum EmploymentType {
    PERMANENT
    CONTRACT
    INTERN
    PROBATION
  }

  type Job {
    jobId: Int!
    jobTitle: String!
  }

  type Department {
    departmentId: Int!
    departmentName: String!
    locationId: Int
  }

  type Dependents{
    dependentId: Int!
    firstName: String
    lastName: String
    employeeId: Int
  }

  type Employee {
    employeeId: Int!
    firstName: String
    lastName: String!
    email: String!
    phoneNumber: String
    hireDate: String!
    jobId: Int!
    job: Job
    salary: Float!
    managerId: Int
    manager: Employee
    directReports: [Employee!]!
    departmentId: Int
    department: Department
    employmentStatus: EmploymentStatus!
    employmentType: EmploymentType!
    terminationDate: String
    createdAt: String!
    updatedAt: String!
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
  }

  type EmployeeConnection {
    items: [Employee!]!
    pagination: Pagination!
  }

  input EmployeeFilterInput {
    search: String
    departmentId: Int
    jobId: Int
    managerId: Int
    employmentStatus: EmploymentStatus
    employmentType: EmploymentType
  }

  input CreateEmployeeInput {
    firstName: String
    lastName: String!
    email: String!
    phoneNumber: String
    hireDate: String!
    jobId: Int!
    salary: Float!
    managerId: Int
    departmentId: Int
    employmentStatus: EmploymentStatus
    employmentType: EmploymentType
    terminationDate: String
  }

  input UpdateEmployeeInput {
    firstName: String
    lastName: String
    email: String
    phoneNumber: String
    hireDate: String
    jobId: Int
    salary: Float
    managerId: Int
    departmentId: Int
    employmentStatus: EmploymentStatus
    employmentType: EmploymentType
    terminationDate: String
  }

  type Query {
    employees(page: Int = 1, limit: Int = 20, filter: EmployeeFilterInput): EmployeeConnection!
    employee(id: Int!): Employee
  }

  type Mutation {
    createEmployee(input: CreateEmployeeInput!): Employee!
    updateEmployee(id: Int!, input: UpdateEmployeeInput!): Employee!
    deleteEmployee(id: Int!): Boolean!
  }
`