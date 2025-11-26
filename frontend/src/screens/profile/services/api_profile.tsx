import client from '../../../auth/api-client/api_client';
import { InstituteProfileResponse } from '../../../shared/models/InstituteProfileResponse';
import { DashboardResponse } from '../../dashboard/models/dashboard/DashboardResponse';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';

// Get Profile API
const getProfile = async () => {
  try {
    return await client.get<DashboardResponse>('/profile/');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Edit Profile API
const editProfile = async (profileData: object) => {
  try {
    return await client.put<DashboardResponse>('/profile/', profileData);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Request Password Change OTP
const requestPasswordChangeOtp = async () => {
  try {
    return await client.post<object>('/profile/change-password-otp');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Change Password WITH OTP verification
const changePasswordWithOtp = async ({
  oldPassword,
  newPassword,
  otp,
}: {
  oldPassword: string,
  newPassword: string,
  otp: string
}) => {
  try {
    return await client.post<object>('/profile/change-password', {
      oldPassword,
      newPassword,
      otp,
    });
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Change Number
const changeNumber = async (phoneNumber: string) => {
  try {
    return await client.post<object>('/profile/change-number', { phoneNumber });
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get Linked Accounts
const getLinkedAccounts = async () => {
  try {
    return await client.get<object>('/profile/linked-accounts');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Request Email Change
const requestEmailChange = async (currentPassword: string, newEmail: string ) => {
  try {
    return await client.post<object>('/profile/linked-accounts/request-email-change', { currentPassword, newEmail });
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Verify Email Change
const verifyEmailChange = async ( otp: string ) => {
  try {
    return await client.post<object>('/profile/linked-accounts/verify-email-change', { otp });
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Manage Linked Accounts (show registered email)
const manageLinkedAccounts = async (payload: object) => {
  try {
    return await client.post<object>('/profile/linked-accounts', payload);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Update Avatar or Bitmoji
const updateAvatarOrBitmoji = async (avatarOrBitmoji: object) => {
  try {
    return await client.put<object>('/profile/avatar', avatarOrBitmoji);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Update Notifications
const updateNotifications = async (settings: object) => {
  try {
    return await client.post<object>('/profile/notifications', settings);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Update App Settings
const updateAppSettings = async (settings: object) => {
  try {
    return await client.post<object>('/profile/app-settings', settings);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Delete Account (CAREFUL)
const deleteAccount = async () => {
  try {
    return await client.delete<object>('/profile/delete');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get Login Activity
const getLoginActivity = async () => {
  try {
    return await client.get<object>('/profile/login-activity');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

export default {
  getProfile,
  editProfile,
  requestPasswordChangeOtp,
  changePasswordWithOtp,
  changeNumber,
  getLinkedAccounts,
  requestEmailChange,
  verifyEmailChange,
  manageLinkedAccounts,
  updateAvatarOrBitmoji,
  updateNotifications,
  updateAppSettings,
  deleteAccount,
  getLoginActivity,
};
