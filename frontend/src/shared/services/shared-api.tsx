import {BranchListResponse} from '../models/BranchListResponse';
import {BranchClassListResponse} from '../models/BranchClassListResponse';
import {ClassSectionListResponse} from '../models/ClassSectionListResponse';
import client from '../../auth/api-client/api_client';
import { JWTrequest } from './response';
import { JwtValidators, UserTokenProfile } from '../../screens/user/models/UserLoginResponse';
import { create } from 'apisauce';
import { HTTP_Headers } from '../config/enum';
import { DateHelperService, MomentDateFormats } from './DateHelperService';

// getBranchList API
const getBranchList = (instituteId: number, branchIds: string) =>
  client.get<BranchListResponse>('/Institute/GetBranchList', {
    instituteId: instituteId,
    branchIds: branchIds,
  });

// getBranchClassList API
const getBranchClassList = (instituteId: number, branchIds: string) =>
  client.get<BranchClassListResponse>('/Student/GetBranchClassList', {
    instituteId: instituteId,
    branchIds: branchIds,
  });

  const RefreshToken = () =>
    client.get<JWTrequest>('/Identity/RefreshToken');

  const LogoutUser = () =>
    client.post('/Identity/logout');

// getClassSectionList APIhttps://api.gateway.nafdevtech.net/AdminApp/api/Identity/RefreshToken
const getClassSectionList = (
  instituteId: number,
  branchIds: string,
  branchClassId?: number, // Make branchClassId optional
) => {
  // Check if branchClassId is provided
  const params: Record<string, any> = {
    instituteId: instituteId,
    branchIds: branchIds,
  };

  // Add branchClassId to params if provided
  if (branchClassId !== undefined) {
    params['branchClassId'] = branchClassId;
  }

  return client.get<ClassSectionListResponse>(
    '/Student/GetClassSectionList',
    params,
  );
};

// const refreshToken = () => {
//   const jwtValidators = new JwtValidators() 
//     jwtValidators.ApplicationName = HTTP_Headers.ApplicationName;
//     jwtValidators.DomainName = HTTP_Headers.DomainName;

// const apiClient = create({
//   baseURL: "https://api.gateway.nafdevtech.net/SchoolApp/api/",
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });


// export const setSecretKey = () => {
//   apiClient.setHeader('Internal-Secret-Key', HTTP_Headers.InternalSecretKey);
//   apiClient.setHeader('JV', JSON.stringify(jwtValidators));
// };


// // Function to set bearer token
// export const setAuthHeaders = async (token: string, userFromContext: any) => {
//   let decodedToken: UserTokenProfile = new UserTokenProfile();
//   let currentUser = "";
//   if (token) {
//     decodedToken = jwtDecode<UserTokenProfile>(token);
//     const User = userFromContext
//     //console.log(User);
    
//     if (decodedToken) {
//       if (User?.InstituteProfile) {
//         let startDate = User?.InstituteProfile?.StartDate;
//         let endDate = User?.InstituteProfile?.EndDate;
//         if (startDate && endDate) {
//           decodedToken.SessionStartDate =
//             DateHelperService.getServerDateFormat(
//               startDate,
//               MomentDateFormats.currentDateFormatSlash
//             );
//           decodedToken.SessionEndDate = DateHelperService.getServerDateFormat(
//             endDate,
//             MomentDateFormats.currentDateFormatSlash
//           );
//         }
//         decodedToken.CurrentBranchId = User?.CurrentBranch
//           ?.toString();
//       }
//     } 
//     if (decodedToken) {
//       decodedToken.UserId = User?.Id;
//     }

//       currentUser = JSON.stringify(decodedToken);
//       //console.log(currentUser);
//       let CurrentBranchId = decodedToken.BranchId?.toString();
//       //console.log(CurrentBranchId)
//     apiClient.setHeader('CurrentUser', `${currentUser}`); 
//     apiClient.setHeader('CurrentBranchId', `${CurrentBranchId}`);
//     apiClient.setHeader('Authorization', `Bearer ${token}`);
// }
// };
// }

export default {
  getBranchList,
  getBranchClassList,
  getClassSectionList,
  RefreshToken,
  LogoutUser
};
