import {EmployeeListResponse} from '../models/EmployeeListResponse';
import {DashboardEmployeeSummaryResponse} from '../../dashboard/models/dashboard/DashboardEmployeeSummaryResponse';
import {EmployeeLoanResponse} from '../models/EmployeeLoanResponse';
import {MultipleActiveInactiveEmployeeResponse} from '../models/MultipleActiveInactiveEmployeeResponse';
import {EmployeeRevokeLoanResponse} from '../models/EmployeeRevokeLoanResponse';
import client from '../../../auth/api-client/api_client';

// getEmployeeList API
const getEmployeeList = (
  instituteId: number,
  branchIds: string,
  employeeStatus: number,
  employeeLimit: number,
) =>
  client.get<EmployeeListResponse>('/Employee/GetEmployeeList', {
    instituteId: instituteId,
    branchIds: branchIds,
    employeeStatus: employeeStatus,
    employeeLimit: employeeLimit,
  });

// getDashboardEmployeeSummary API
const getDashboardEmployeeSummary = (instituteId: number, branchIds: string) =>
  client.get<DashboardEmployeeSummaryResponse>(
    '/Dashboard/GetDashboardEmployeeSummary',
    {instituteId: instituteId, branchIds: branchIds},
  );

// getEmployeeLoanList API
const getEmployeeLoanList = (employeeId: number) =>
  client.get<EmployeeLoanResponse>('/Employee/GetEmployeeLoanSummary', {
    employeeId: employeeId,
  });

// MultipleActiveInactiveEmployee API
const MultipleActiveInactiveEmployee = (status: boolean, id: number[]) => {
  const queryParams = `?username=${encodeURIComponent(status)}`;
  const urlWithParams = `${'/Employee/MultipleActiveInactiveEmployee'}${queryParams}`;

  return client.post<MultipleActiveInactiveEmployeeResponse>(urlWithParams, id);
};

// RevokeEmployeeLoan API
const RevokeEmployeeLoan = (employeeLoanId: number) => {
  const queryParams = `?employeeLoanId=${encodeURIComponent(employeeLoanId)}`;
  const urlWithParams = `${'/Employee/RevokeEmployeeLoan'}${queryParams}`;

  return client.post<EmployeeRevokeLoanResponse>(urlWithParams);
};

export default {
  getEmployeeList,
  getDashboardEmployeeSummary,
  getEmployeeLoanList,
  MultipleActiveInactiveEmployee,
  RevokeEmployeeLoan,
};
