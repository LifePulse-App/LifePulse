import {UserListResponse} from '../models/UserListResponse';
import client from '../../../auth/api-client/api_client';
import { DashboardSummary } from '../../dashboard/models/dashboard/DashboardResponse';
import  {ResultSummary} from '../../dashboard/models/dashboard/resultsummaryresponse';

// getUserList API
// api_Student.ts (or wherever your client calls are)
const getResult = (courseName: string) =>
  client.get<ResultSummary>(`/results/${encodeURIComponent(courseName)}`);


// getUserChangePassword API
const getUserChangePassword = (
  email: string,
  username: string,
  password: string,
) => {
  const queryParams = `?email=${encodeURIComponent(
    email,
  )}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(
    password,
  )}`;
  const urlWithParams = `${'/Identity/UpdateForgotPassword'}${queryParams}`;

  return client.post<object>(urlWithParams, {});
};

// updateUserStatus API
const updateUserStatus = (username: string) => {
  const queryParams = `?username=${encodeURIComponent(username)}`;
  const urlWithParams = `${'/Identity/UpdateUserStatus'}${queryParams}`;

  return client.post<boolean>(urlWithParams, {});
};

// getMainUserChangePassword API
const getMainUserChangePassword = (
  username: string,
  currentPassword: string,
  newPassword: string,
) => {
  const queryParams = `?username=${encodeURIComponent(
    username,
  )}&currentPassword=${encodeURIComponent(
    currentPassword,
  )}&newPassword=${encodeURIComponent(newPassword)}`;
  const urlWithParams = `${'/Identity/ChangePassword'}${queryParams}`;

  return client.post<object>(urlWithParams, {});
};

export default {
  getResult,
  getUserChangePassword,
  updateUserStatus,
  getMainUserChangePassword,
};
