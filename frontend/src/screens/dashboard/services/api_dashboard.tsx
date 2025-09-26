import client from "../../../auth/api-client/api_client";
import { DashboardEmployeeSummaryResponse } from "../models/dashboard/DashboardEmployeeSummaryResponse";
import { DashboardResponse } from "../models/dashboard/DashboardResponse";
import { DashboardStudentSummaryResponse } from "../models/dashboard/DashboardStudentSummaryResponse";

const endpoint = '/Dashboard/GetAdminAppDashboardSummary';

const GetDashboardSummary = () => client.get<DashboardResponse>(endpoint);

// getDashboardEmployeeSummary API
const getDashboardEmployeeSummary = (instituteId: number, branchIds: string) =>
    client.get<DashboardEmployeeSummaryResponse>(
      '/Dashboard/GetDashboardEmployeeSummary',
      {instituteId: instituteId, branchIds: branchIds},
);

// getDashboardStudentSummary API
const getDashboardStudentSummary = (instituteId: number, branchIds: string) =>
    client.get<DashboardStudentSummaryResponse>(
      '/Student/GetDashboardStudentSummary',
      {instituteId: instituteId, branchIds: branchIds},
);

export default {
    GetDashboardSummary,
    getDashboardEmployeeSummary,
    getDashboardStudentSummary,
};