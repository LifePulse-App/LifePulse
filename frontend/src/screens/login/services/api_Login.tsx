import client from '../../../auth/api-client/api_client';
import {InstituteProfileResponse} from '../../../shared/models/InstituteProfileResponse';
import { DashboardResponse } from '../../dashboard/models/dashboard/DashboardResponse';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';

// Login API
const getLogin = async (identifier: string, password: string, deviceId: string, deviceName: string, deviceModel: string, deviceBrand: string) => {
  try {
    return await client.post<object>('/auth/login', {
      identifier,
      password,
      deviceId,
      deviceName,
      deviceModel,
      deviceBrand
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Register API
const getRegister = async (name: string, username: string, email: string, password: string, deviceId: string) => {
  try {
    return await client.post<object>('/auth/register', {
      name,
      username,
      email,
      password,
      deviceId
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Verify OTP API
const verifyOtp = async (email: string, otp: number, deviceId: string) => {
  try {
    return await client.post<object>('/auth/verify-email', {
      email,
      otp,
      deviceId
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Verify OTP API
const resendOtp = async (email: string) => {
  try {
    return await client.post<object>('/auth/resend-otp', {
      email
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Verify OTP API
const forgotPass = async (identifier: string) => {
  try {
    return await client.post<object>('/auth/forgot-password', {
      identifier
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Verify ResetPassOTP API
const verifyResetPassOtp = async (email: string, code: number) => {
  try {
    return await client.post<object>('/auth/reset-password/verify-otp', {
      email,
      code
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Verify ResetPassOTP API
const resetPassword = async (emailOrUsername: string, newPassword: string) => {
  try {
    return await client.post<object>('/auth/reset-password/verified-otp', {
      emailOrUsername,
      newPassword
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Google API
const googleLogin = async (idToken: string, deviceId: string) => {
  try {
    return await client.post<object>('/auth/sso/google', {
      idToken, 
      deviceId
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// 2FA verify-login API
const verify2faLogin = async (twoFaToken: string, code?: string, backupCode?: string) => {
  try {
    return await client.post<object>('/auth/2fa/verify-login', {
      twoFaToken,
      code,
      backupCode,
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

const init2fa = async () => {
  try {
    return await client.post<object>('/auth/2fa/enable/init', {});
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};


const confirm2fa = async (token: string) => {
  try {
    return await client.post<object>('/auth/2fa/enable/confirm', { token });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

const disable2fa = async (password: string, code?: string, backupCode?: string) => {
  try {
    return await client.post<object>('/auth/2fa/disable', {
      password,
      code,
      backupCode,
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

const getDevices = async () => {
  try {
    return await client.get<object>('/auth/devices');
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

const logoutDevice = async (deviceId: string) => {
  try {
    return await client.post<object>('/auth/devices/logout', { deviceId });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// GetProfile API
const GetProfile = () =>
  client.get<DashboardResponse>('/auth/me');

export default {
  getLogin,
  getRegister,
  verifyOtp,
  resendOtp,
  verifyResetPassOtp,
  googleLogin,
  GetProfile,
  resetPassword,
  forgotPass,
  init2fa,
  confirm2fa,
  verify2faLogin,
  disable2fa,
  getDevices,
  logoutDevice
};
