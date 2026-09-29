export type EmploymentStatusProto =
  | 'EMPLOYMENT_STATUS_UNSPECIFIED'
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED';

export type EmploymentTypeProto =
  | 'EMPLOYMENT_TYPE_UNSPECIFIED'
  | 'PERMANENT'
  | 'CONTRACT'
  | 'INTERN'
  | 'PROBATION';

export interface EmployeeMessage {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  hire_date: string; 
  job_id: number;
  job_title: string;
  salary: string; 
  manager_id?: number;
  department_id?: number;
  department_name?: string;
  employment_status: EmploymentStatusProto;
  employment_type: EmploymentTypeProto;
  termination_date?: string; 
  created_at: string; 
  updated_at: string; 
}

export interface EmployeeBankAccountMessage {
  bank_account_id: number;
  employee_id: number;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_holder_name: string;
  is_verified: boolean;
}

export interface GetEmployeeRequestMessage {
  employee_id: number;
}

export interface ListActiveEmployeesByDepartmentRequestMessage {
  department_id: number;
}

export interface GetEmployeeBankAccountRequestMessage {
  employee_id: number;
}


export interface DepartmentMessage {
  department_id: number;
  department_name: string;
}