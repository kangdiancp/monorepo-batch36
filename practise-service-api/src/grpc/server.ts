import path from 'node:path';
import { Server, ServerCredentials } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { EmployeeServiceService, type EmployeeServiceServer } from './generated/employee';
import * as employeeGrpcHandler from '../modules/employees/grpc/employees.grpc-handler';
import * as departmentGrpcHandler from '../modules/departments/grpc/departments.grpc-handler';
import { ReflectionService } from '@grpc/reflection';

export function startGrpcServer(port = 50051): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = new Server();

    const handlers: EmployeeServiceServer = {
      getEmployee: employeeGrpcHandler.getEmployee,
      getEmployeesForPayroll: employeeGrpcHandler.getEmployeesForPayroll,
      listDepartments: departmentGrpcHandler.listDepartments,
      createDepartment: departmentGrpcHandler.createDepartment,
      updateDepartment: departmentGrpcHandler.updateDepartment,
      deleteDepartment: departmentGrpcHandler.deleteDepartment,
      getDepartmentWithEmployees: departmentGrpcHandler.getDepartmentWithEmployees
    };

    const protoPath = path.join(__dirname, '../../protos/employee.proto');
    const packageDef = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: Number,
      enums: String,
      defaults: true,
    });
    const reflection = new ReflectionService(packageDef);
    reflection.addToServer(server);

    server.addService(EmployeeServiceService, handlers);

    server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) return reject(err);
      console.log(`[grpc] listening on :${boundPort}`);
      resolve(server);
    });
  });
}
