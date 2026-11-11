import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { env } from '../config/env';
import type {
  EmployeeBankAccountMessage,
  EmployeeMessage,
  GetEmployeeBankAccountRequestMessage,
  GetEmployeeRequestMessage,
  ListActiveEmployeesByDepartmentRequestMessage,
} from './hr.types';

const PROTO_PATH = path.resolve(__dirname, '../../proto/hr.proto');

interface HrServiceClient extends grpc.Client {
  
  GetEmployee(request: GetEmployeeRequestMessage,callback: (err: grpc.ServiceError | null, response?: EmployeeMessage) => void): void;

  ListActiveEmployeesByDepartment(request: ListActiveEmployeesByDepartmentRequestMessage): grpc.ClientReadableStream<EmployeeMessage>;
  
  GetEmployeeBankAccount(request: GetEmployeeBankAccountRequestMessage,callback: (err: grpc.ServiceError | null, response?: EmployeeBankAccountMessage) => void): void;
  
}


export class HrClientError extends Error {
  public readonly code: grpc.status;

  constructor(code: grpc.status, message: string) {
    super(message);
    this.name = 'HrClientError';
    this.code = code;
  }
}

function toHrClientError(err: grpc.ServiceError): HrClientError {
  return new HrClientError(err.code, err.details || err.message);
}


function loadHrServiceConstructor(): new (address: string, credentials: grpc.ChannelCredentials) => HrServiceClient {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    hr: { v1: { HrService: new (address: string, credentials: grpc.ChannelCredentials) => HrServiceClient } };
  };

  return proto.hr.v1.HrService;
}


let client: HrServiceClient | undefined;

export function getHrClient(): HrServiceClient {
  if (!client) {
    const HrServiceCtor = loadHrServiceConstructor();
    client = new HrServiceCtor(`${env.HR_GRPC_HOST}:${env.HR_GRPC_PORT}`, grpc.credentials.createInsecure());
  }
  return client;
}

/** Tutup channel gRPC — dipanggil waktu graceful shutdown (`server.ts`). */
export function closeHrClient(): void {
  client?.close();
  client = undefined;
}

export async function getEmployee(employeeId: number): Promise<EmployeeMessage> {
  const hrClient = getHrClient();
  return new Promise((resolve, reject) => {
    hrClient.GetEmployee({ employee_id: employeeId }, (err, response) => {
      if (err) {
        reject(toHrClientError(err));
        return;
      }
      resolve(response!);
    });
  });
}

export async function getEmployeeBankAccount(employeeId: number): Promise<EmployeeBankAccountMessage> {
  const hrClient = getHrClient();
  return new Promise((resolve, reject) => {
    hrClient.GetEmployeeBankAccount({ employee_id: employeeId }, (err, response) => {
      if (err) {
        reject(toHrClientError(err));
        return;
      }
      resolve(response!);
    });
  });
}


export async function listActiveEmployeesByDepartment(departmentId: number): Promise<EmployeeMessage[]> {
  const hrClient = getHrClient();
  return new Promise((resolve, reject) => {
    const results: EmployeeMessage[] = [];
    const stream = hrClient.ListActiveEmployeesByDepartment({ department_id: departmentId });

    stream.on('data', (employee: EmployeeMessage) => {
      results.push(employee);
    });
    stream.on('end', () => resolve(results));
    stream.on('error', (err: grpc.ServiceError) => reject(toHrClientError(err)));
  });
}

export function listDepartments(): import("./hr.types").DepartmentMessage[] | PromiseLike<import("./hr.types").DepartmentMessage[]> {
  throw new Error('Function not implemented.');
}
export function streamEmployeesForPayroll(undefined: undefined, arg1: (employee: any) => Promise<void>) {
  throw new Error('Function not implemented.');
}

