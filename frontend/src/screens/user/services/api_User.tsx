import {UserListResponse} from '../models/UserListResponse';
import client from '../../../auth/api-client/api_client';

// getUserList API
const getUserList = (
  instituteId: number,
  branchIds: string,
  userLimit: number,
) =>
  client.get<UserListResponse>('/Identity/GetUsers', {
    instituteId: instituteId,
    branchIds: branchIds,
    userLimit: userLimit,
  });

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
  getUserList,
  getUserChangePassword,
  updateUserStatus,
  getMainUserChangePassword,
};
