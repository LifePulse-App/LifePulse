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

// Apple API
const appleLogin = async (identityToken: string) => {
  try {
    return await client.post<object>('/auth/sso/apple', {
      identityToken
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

// Google API
const googleLogin = async (identityToken: string, deviceId: string) => {
  try {
    return await client.post<object>('/auth/sso/google', {
      identityToken, 
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
  client.get<DashboardResponse>('/me');

export default {
  getLogin,
  appleLogin,
  googleLogin,
  GetProfile,
};
