import client from "../../../auth/api-client/api_client";
import { GetTodayHabitsResponse } from "../models/HabitResponse";
import { DashboardEmployeeSummaryResponse } from "../models/dashboard/DashboardEmployeeSummaryResponse";
import { DashboardResponse } from "../models/dashboard/DashboardResponse";
import { DashboardStudentSummaryResponse } from "../models/dashboard/DashboardStudentSummaryResponse";

const endpoint = '/dashboard';

const GetDashboardSummary = () => client.get<DashboardResponse>(endpoint);
const GetTodayHabits = () => client.get<GetTodayHabitsResponse>('/habit/getToday');

// // getDashboardEmployeeSummary API
// const getDashboardEmployeeSummary = (instituteId: number, branchIds: string) =>
//     client.get<DashboardEmployeeSummaryResponse>(
//       '/Dashboard/GetDashboardEmployeeSummary',
//       {instituteId: instituteId, branchIds: branchIds},
// );

// // getDashboardStudentSummary API
// const getDashboardStudentSummary = (instituteId: number, branchIds: string) =>
//     client.get<DashboardStudentSummaryResponse>(
//       '/Student/GetDashboardStudentSummary',
//       {instituteId: instituteId, branchIds: branchIds},
// );

export default {
    GetDashboardSummary,
    GetTodayHabits
    // getDashboardEmployeeSummary,
    // getDashboardStudentSummary,
};