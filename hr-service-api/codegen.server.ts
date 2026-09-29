import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'http://localhost:3002/graphql',
  generates: {
    'src/graphql/generated/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: 'mercurius#MercuriusContext',

        mappers: {
          Employee: '../../modules/employees/employees.types#EmployeeApiRow',
          Department: '../../modules/departments/departments.types#DepartmentRow',
        },

        avoidOptionals: false,
      },
    },
  },
}

export default config