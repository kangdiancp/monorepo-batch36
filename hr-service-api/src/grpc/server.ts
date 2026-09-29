import { Server, ServerCredentials } from '@grpc/grpc-js';
import { EmployeeServiceService, type EmployeeServiceServer } from './generated/employee';
import * as employeeGrpcHandler from '../modules/employees/grpc/employees.grpc-handler';
import * as departmentGrpcHandler from '../modules/departments/grpc/department.grpc-handler';

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
      getDepartmentWithEmployees: departmentGrpcHandler.getDepartmentWithEmployees,
    };

    server.addService(EmployeeServiceService, handlers);

    server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) return reject(err);
      console.log(`[grpc] listening on :${boundPort}`);
      resolve(server);
    });
  });
}
