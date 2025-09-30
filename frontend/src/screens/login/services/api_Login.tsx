import client from '../../../auth/api-client/api_client';
import {InstituteProfileResponse} from '../../../shared/models/InstituteProfileResponse';
import { DashboardResponse } from '../../dashboard/models/dashboard/DashboardResponse';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';

// Login API
const getLogin = async (identifier: string, password: string) => {
  try {
    return await client.post<object>('/auth/login', {
      identifier,
      password,
    });
  } catch (error: any) {
    if (!error.response) {
      // No response from server (network error / offline)
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
  GetProfile,
};
