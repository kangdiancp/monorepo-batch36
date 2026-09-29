import { GraphQLResolveInfo } from 'graphql';
import { EmployeeApiRow } from '../../modules/employees/employees.types';
import { DepartmentRow } from '../../modules/departments/departments.types';
import { MercuriusContext } from 'mercurius';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateDepartmentInput = {
  departmentName: Scalars['String']['input'];
  locationId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateEmployeeInput = {
  departmentId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  employmentStatus?: InputMaybe<EmploymentStatus>;
  employmentType?: InputMaybe<EmploymentType>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  hireDate: Scalars['String']['input'];
  jobId: Scalars['Int']['input'];
  lastName: Scalars['String']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  salary: Scalars['Float']['input'];
  terminationDate?: InputMaybe<Scalars['String']['input']>;
};

export type Department = {
  __typename?: 'Department';
  departmentId: Scalars['Int']['output'];
  departmentName: Scalars['String']['output'];
  employees: Array<Employee>;
  locationId?: Maybe<Scalars['Int']['output']>;
};

export type DepartmentConnection = {
  __typename?: 'DepartmentConnection';
  items: Array<Department>;
  pagination: Pagination;
};

export type DepartmentFilterInput = {
  locationId?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Employee = {
  __typename?: 'Employee';
  createdAt: Scalars['String']['output'];
  department?: Maybe<Department>;
  departmentId?: Maybe<Scalars['Int']['output']>;
  directReports: Array<Employee>;
  email: Scalars['String']['output'];
  employeeId: Scalars['Int']['output'];
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  firstName?: Maybe<Scalars['String']['output']>;
  hireDate: Scalars['String']['output'];
  job?: Maybe<Job>;
  jobId: Scalars['Int']['output'];
  lastName: Scalars['String']['output'];
  manager?: Maybe<Employee>;
  managerId?: Maybe<Scalars['Int']['output']>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  salary: Scalars['Float']['output'];
  terminationDate?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type EmployeeConnection = {
  __typename?: 'EmployeeConnection';
  items: Array<Employee>;
  pagination: Pagination;
};

export type EmployeeFilterInput = {
  departmentId?: InputMaybe<Scalars['Int']['input']>;
  employmentStatus?: InputMaybe<EmploymentStatus>;
  employmentType?: InputMaybe<EmploymentType>;
  jobId?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export enum EmploymentStatus {
  Active = 'ACTIVE',
  OnLeave = 'ON_LEAVE',
  Resigned = 'RESIGNED',
  Suspended = 'SUSPENDED',
  Terminated = 'TERMINATED'
}

export enum EmploymentType {
  Contract = 'CONTRACT',
  Intern = 'INTERN',
  Permanent = 'PERMANENT',
  Probation = 'PROBATION'
}

export type Job = {
  __typename?: 'Job';
  jobId: Scalars['Int']['output'];
  jobTitle: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createDepartment: Department;
  createEmployee: Employee;
  deleteDepartment: Scalars['Boolean']['output'];
  deleteEmployee: Scalars['Boolean']['output'];
  updateDepartment: Department;
  updateEmployee: Employee;
};


export type MutationCreateDepartmentArgs = {
  input: CreateDepartmentInput;
};


export type MutationCreateEmployeeArgs = {
  input: CreateEmployeeInput;
};


export type MutationDeleteDepartmentArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteEmployeeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUpdateDepartmentArgs = {
  id: Scalars['Int']['input'];
  input: UpdateDepartmentInput;
};


export type MutationUpdateEmployeeArgs = {
  id: Scalars['Int']['input'];
  input: UpdateEmployeeInput;
};

export type Pagination = {
  __typename?: 'Pagination';
  limit: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  department?: Maybe<Department>;
  departments: DepartmentConnection;
  employee?: Maybe<Employee>;
  employees: EmployeeConnection;
};


export type QueryDepartmentArgs = {
  id: Scalars['Int']['input'];
};


export type QueryDepartmentsArgs = {
  filter?: InputMaybe<DepartmentFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmployeeArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEmployeesArgs = {
  filter?: InputMaybe<EmployeeFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDepartmentInput = {
  departmentName?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateEmployeeInput = {
  departmentId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  employmentStatus?: InputMaybe<EmploymentStatus>;
  employmentType?: InputMaybe<EmploymentType>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  hireDate?: InputMaybe<Scalars['String']['input']>;
  jobId?: InputMaybe<Scalars['Int']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  salary?: InputMaybe<Scalars['Float']['input']>;
  terminationDate?: InputMaybe<Scalars['String']['input']>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateDepartmentInput: CreateDepartmentInput;
  CreateEmployeeInput: CreateEmployeeInput;
  Department: ResolverTypeWrapper<DepartmentRow>;
  DepartmentConnection: ResolverTypeWrapper<Omit<DepartmentConnection, 'items'> & { items: Array<ResolversTypes['Department']> }>;
  DepartmentFilterInput: DepartmentFilterInput;
  Employee: ResolverTypeWrapper<EmployeeApiRow>;
  EmployeeConnection: ResolverTypeWrapper<Omit<EmployeeConnection, 'items'> & { items: Array<ResolversTypes['Employee']> }>;
  EmployeeFilterInput: EmployeeFilterInput;
  EmploymentStatus: EmploymentStatus;
  EmploymentType: EmploymentType;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Job: ResolverTypeWrapper<Job>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Pagination: ResolverTypeWrapper<Pagination>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateDepartmentInput: UpdateDepartmentInput;
  UpdateEmployeeInput: UpdateEmployeeInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  CreateDepartmentInput: CreateDepartmentInput;
  CreateEmployeeInput: CreateEmployeeInput;
  Department: DepartmentRow;
  DepartmentConnection: Omit<DepartmentConnection, 'items'> & { items: Array<ResolversParentTypes['Department']> };
  DepartmentFilterInput: DepartmentFilterInput;
  Employee: EmployeeApiRow;
  EmployeeConnection: Omit<EmployeeConnection, 'items'> & { items: Array<ResolversParentTypes['Employee']> };
  EmployeeFilterInput: EmployeeFilterInput;
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  Job: Job;
  Mutation: Record<PropertyKey, never>;
  Pagination: Pagination;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  UpdateDepartmentInput: UpdateDepartmentInput;
  UpdateEmployeeInput: UpdateEmployeeInput;
};

export type DepartmentResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Department'] = ResolversParentTypes['Department']> = {
  departmentId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  departmentName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  employees?: Resolver<Array<ResolversTypes['Employee']>, ParentType, ContextType>;
  locationId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type DepartmentConnectionResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['DepartmentConnection'] = ResolversParentTypes['DepartmentConnection']> = {
  items?: Resolver<Array<ResolversTypes['Department']>, ParentType, ContextType>;
  pagination?: Resolver<ResolversTypes['Pagination'], ParentType, ContextType>;
};

export type EmployeeResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Employee'] = ResolversParentTypes['Employee']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  department?: Resolver<Maybe<ResolversTypes['Department']>, ParentType, ContextType>;
  departmentId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  directReports?: Resolver<Array<ResolversTypes['Employee']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  employeeId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  employmentStatus?: Resolver<ResolversTypes['EmploymentStatus'], ParentType, ContextType>;
  employmentType?: Resolver<ResolversTypes['EmploymentType'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hireDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  manager?: Resolver<Maybe<ResolversTypes['Employee']>, ParentType, ContextType>;
  managerId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  salary?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  terminationDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type EmployeeConnectionResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['EmployeeConnection'] = ResolversParentTypes['EmployeeConnection']> = {
  items?: Resolver<Array<ResolversTypes['Employee']>, ParentType, ContextType>;
  pagination?: Resolver<ResolversTypes['Pagination'], ParentType, ContextType>;
};

export type JobResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = {
  jobId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createDepartment?: Resolver<ResolversTypes['Department'], ParentType, ContextType, RequireFields<MutationCreateDepartmentArgs, 'input'>>;
  createEmployee?: Resolver<ResolversTypes['Employee'], ParentType, ContextType, RequireFields<MutationCreateEmployeeArgs, 'input'>>;
  deleteDepartment?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteDepartmentArgs, 'id'>>;
  deleteEmployee?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteEmployeeArgs, 'id'>>;
  updateDepartment?: Resolver<ResolversTypes['Department'], ParentType, ContextType, RequireFields<MutationUpdateDepartmentArgs, 'id' | 'input'>>;
  updateEmployee?: Resolver<ResolversTypes['Employee'], ParentType, ContextType, RequireFields<MutationUpdateEmployeeArgs, 'id' | 'input'>>;
};

export type PaginationResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Pagination'] = ResolversParentTypes['Pagination']> = {
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalPages?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = MercuriusContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  department?: Resolver<Maybe<ResolversTypes['Department']>, ParentType, ContextType, RequireFields<QueryDepartmentArgs, 'id'>>;
  departments?: Resolver<ResolversTypes['DepartmentConnection'], ParentType, ContextType, RequireFields<QueryDepartmentsArgs, 'limit' | 'page'>>;
  employee?: Resolver<Maybe<ResolversTypes['Employee']>, ParentType, ContextType, RequireFields<QueryEmployeeArgs, 'id'>>;
  employees?: Resolver<ResolversTypes['EmployeeConnection'], ParentType, ContextType, RequireFields<QueryEmployeesArgs, 'limit' | 'page'>>;
};

export type Resolvers<ContextType = MercuriusContext> = {
  Department?: DepartmentResolvers<ContextType>;
  DepartmentConnection?: DepartmentConnectionResolvers<ContextType>;
  Employee?: EmployeeResolvers<ContextType>;
  EmployeeConnection?: EmployeeConnectionResolvers<ContextType>;
  Job?: JobResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Pagination?: PaginationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

