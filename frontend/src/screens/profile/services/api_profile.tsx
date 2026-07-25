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
const requestPasswordChangeOtp = async (oldPassword: string) => {
  try {
    return await client.post<object>('/profile/change-password-otp', {oldPassword});
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
    return await client.post<object>('/profile/request-delete');
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

const getAvatar = async () => {
  return client.get('/profile/me/avatar');
};

const updateAvatar = async (config: any) => {
  return client.post('/profile/me/avatar', config);
};

const getAvatarUrl = async () => {
  return client.get('/profile/me/avatar-url');
};

const updateAvatarUrl = async (avatarUrl: string, avatarMetadata?: any) => {
  return client.post('/profile/me/avatar-url', { avatarUrl, avatarMetadata });
};

const updateAvatarImage = async (formData: FormData) => {
  try {
    // Adjust the URL to match your backend route!
    return await client.post<object>(
      '/profile/me/avatar-url', // Or '/profile/upload-avatar' or as set in backend!
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

const deleteAvatar = async () => {
  return client.delete('/profile/me/delete-avatar');
};

// Delete Account WITH OTP
const deleteAccountWithOtp = async (otp: string) => {
  try {
    return await client.post<object>('/profile/delete', { otp });
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};



// Send a relationship request to a specific user
const sendRelationshipRequest = async (targetUserId: string) => {
  try {
    return await client.post(`/relationship/request/${targetUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Accept an incoming relationship request
const acceptRelationshipRequest = async (targetUserId: string) => {
  try {
    return await client.post(`/relationship/accept/${targetUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Cancel an outgoing request or decline an incoming request
const cancelRelationshipRequest = async (targetUserId: string) => {
  try {
    return await client.post(`/relationship/cancel/${targetUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Suspend a relationship (Starts the 24-hour grace period timer)
const removeRelationship = async () => {
  try {
    return await client.post('/relationship/remove');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Restore a suspended relationship (Before the 24 hours runs out)
const restoreRelationship = async () => {
  try {
    return await client.post('/relationship/restore');
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
  getAvatar,
  updateAvatar,
  getAvatarUrl,
  updateAvatarUrl,
  updateAvatarImage,
  deleteAvatar,
  deleteAccountWithOtp,
  cancelRelationshipRequest,
  acceptRelationshipRequest,
  sendRelationshipRequest,
  removeRelationship,
  restoreRelationship
};
