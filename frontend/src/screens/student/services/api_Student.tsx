import {StudentListResponse} from '../models/StudentListResponse';
import {DashboardStudentSummaryResponse} from '../../dashboard/models/dashboard/DashboardStudentSummaryResponse';
import {StudentFeeListResponse} from '../models/StudentFeeListResponse';
import {StudentOverduesAdjustmentResponse} from '../models/StudentOverduesAdjustmentResponse';
import {StudentOverduesAdjustmentListResponse} from '../models/StudentOverduesAdjustmentListResponse';
import {StudentOverduesListResponse} from '../models/StudentOverduesListResponse';
import {StudentRevokeOverduesResponse} from '../models/StudentRevokeOverduesResponse';
import client from '../../../auth/api-client/api_client';
import { AnnualItemInvoiceDetailRequest } from '../models/StudentAnnualItemResponse';

// getStudentList API
const getStudentList = (
  BranchId: number,
  InstituteId: number,
  BranchIds: string,
  FromDate: string,
  ToDate: string,
  StatusIds: string,
  TypeIds: string,
  BranchClassIds: string,
  ClassSectionIds: string,
  StudentIds: string,
  StudentStatus: string,
) =>
  client.post<StudentListResponse>('/Student/GetStudentInfo', {
    BranchId,
    InstituteId,
    BranchIds,
    FromDate,
    ToDate,
    StatusIds,
    TypeIds,
    BranchClassIds,
    ClassSectionIds,
    StudentIds,
    StudentStatus,
  });

// getDashboardStudentSummary API
const getDashboardStudentSummary = (instituteId: number, branchIds: string) =>
  client.get<DashboardStudentSummaryResponse>(
    '/Student/GetDashboardStudentSummary',
    {instituteId: instituteId, branchIds: branchIds},
  );

// MultipleActiveInactiveStudent API
const MultipleActiveInactiveStudent = (status: string, id: number[]) => {
  const queryParams = `?status=${encodeURIComponent(status)}`;
  const urlWithParams = `${'/Student/MultipleActiveInactiveStudent'}${queryParams}`;

  return client.post<number[]>(urlWithParams, id);
};

// getStudentFeeList API
const getStudentFeeList = (
  studentBasicId: number,
  instituteId: number,
  sessionStartDate: string,
  sessionEndDate: string,
  isToAddHistory: boolean,
) =>
  client.get<StudentFeeListResponse>('/Overdues/GetStudentFeeList', {
    studentBasicId: studentBasicId,
    instituteId: instituteId,
    sessionStartDate: sessionStartDate,
    sessionEndDate: sessionEndDate,
    isToAddHistory: isToAddHistory,
  });

//  updateOverdueAdjustmentModifiedDate API
const updateOverdueAdjustmentModifiedDate = (
  dateTime: string,
  adjustmentId: number,
) => {
  const queryParams = `?dateTime=${encodeURIComponent(
    dateTime,
  )}&adjustmentId=${encodeURIComponent(adjustmentId)}`;
  const urlWithParams = `${'/StudentOverdues/UpdateOverdueAdjustmentModifiedDate'}${queryParams}`;

  return client.post<StudentOverduesAdjustmentResponse>(urlWithParams, {});
};

// getStudentOverduesAdjustmentList API
const getStudentOverduesAdjustmentList = (overduesId: number) =>
  client.get<StudentOverduesAdjustmentListResponse>(
    '/StudentOverdues/GetOverduesAdjustmentList',
    {
      overduesId: overduesId,
    },
  );

// getStudentOverduesList API
const getStudentOverduesList = (
  studentBasicId: number,
  sessionStartDate: string,
  sessionEndDate: string,
) =>
  client.get<StudentOverduesListResponse>('/Overdues/GetStudentOverduesList', {
    studentBasicId: studentBasicId,
    sessionStartDate: sessionStartDate,
    sessionEndDate: sessionEndDate,
  });

// StudentRevokeOverdues API
const StudentRevokeOverdues = (overduesId: number) => {
  const queryParams = `?overduesId=${encodeURIComponent(overduesId)}`;
  const urlWithParams = `${'/StudentOverdues/RevokeOverdues'}${queryParams}`;

  return client.post<StudentRevokeOverduesResponse>(urlWithParams, {});
};

// GetAnnualItemInvoiceById API
const getAnnualItemInvoiceById = (overduesId: number) => {
  const queryParams = `?overduesId=${encodeURIComponent(overduesId)}`;
  const urlWithParams = `/StudentCollection/GetAnnualItemInvoiceById${queryParams}`;

  return client.get<AnnualItemInvoiceDetailRequest>(urlWithParams);
};


export default {
  getStudentList,
  getDashboardStudentSummary,
  MultipleActiveInactiveStudent,
  getStudentFeeList,
  updateOverdueAdjustmentModifiedDate,
  getStudentOverduesAdjustmentList,
  getStudentOverduesList,
  StudentRevokeOverdues,
  getAnnualItemInvoiceById
};
