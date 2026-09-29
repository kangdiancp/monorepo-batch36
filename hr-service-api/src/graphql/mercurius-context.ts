import type { EmployeeLoaders } from '../modules/employees/graphql/employees.loaders'
import type { DepartmentLoaders } from '../modules/departments/graphql/departments.loaders'

declare module 'mercurius' {
  interface MercuriusContext {
    loaders: EmployeeLoaders & DepartmentLoaders
  }
}

// export {} supaya file ini dianggap module oleh TS (bukan ambient script),
// wajib ada kalau file cuma isi `declare module` tanpa import/export lain.
export {}