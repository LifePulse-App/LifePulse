import client from '../../../auth/api-client/api_client';
import {InstituteProfileResponse} from '../../../shared/models/InstituteProfileResponse';

// Login API
const getLogin = (username: string, password: string) =>
  client.post<object>('/Identity/UserLogin', {
    UserName: username,
    Password: password,
  });

// GetInstituteProfile API
const GetInstituteProfile = (
  instituteId: number,
  branchId: number,
  includeDetail: boolean,
) =>
  client.get<InstituteProfileResponse>('/Institute/GetInstituteProfile', {
    instituteId: instituteId,
    branchId: branchId,
    includeDetail: includeDetail,
  });

export default {
  getLogin,
  GetInstituteProfile,
};
