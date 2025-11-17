import client from '../../../auth/api-client/api_client';
import {InstituteProfileResponse} from '../../../shared/models/InstituteProfileResponse';
import { DashboardResponse } from '../../dashboard/models/dashboard/DashboardResponse';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';

// Login API
const getLogin = async (identifier: string, password: string, deviceId: string) => {
  try {
    return await client.post<object>('/auth/login', {
      identifier,
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

// GetProfile API
const GetProfile = () =>
  client.get<DashboardResponse>('/auth/me');

export default {
  getLogin,
  getRegister,
  verifyOtp,
  resendOtp,
  googleLogin,
  GetProfile,
};
