import {create} from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import { JwtValidators, UserTokenProfile } from '../../screens/user/models/UserLoginResponse';
import { jwtDecode } from 'jwt-decode';
import { useContext } from 'react';
import AuthContext from '../user/UserContext';
import { DateHelperService, MomentDateFormats } from '../../shared/services/DateHelperService';
import UserStorage from '../user/UserStorage';
//import { BASE_URL } from '../../../env';

const jwtValidators = new JwtValidators() 
    jwtValidators.ApplicationName = HTTP_Headers.ApplicationName;
    jwtValidators.DomainName = HTTP_Headers.DomainName;

const apiClient = create({
  baseURL: "https://api.gateway.nafdevtech.net/SchoolApp/api/",
  headers: {
    'Content-Type': 'application/json',
  },
});


export const setSecretKey = () => {
  apiClient.setHeader('Internal-Secret-Key', HTTP_Headers.InternalSecretKey);
  apiClient.setHeader('JV', JSON.stringify(jwtValidators));
};


// Function to set bearer token
export const setAuthHeaders = async (token: string, userFromContext: any) => {
  let decodedToken: UserTokenProfile = new UserTokenProfile();
  let currentUser = "";
  if (token) {
    decodedToken = jwtDecode<UserTokenProfile>(token);
    const User = userFromContext
    //console.log(User);
    
    if (decodedToken) {
      if (User?.InstituteProfile) {
        let startDate = User?.InstituteProfile?.StartDate;
        let endDate = User?.InstituteProfile?.EndDate;
        if (startDate && endDate) {
          decodedToken.SessionStartDate =
            DateHelperService.getServerDateFormat(
              startDate,
              MomentDateFormats.currentDateFormatSlash
            );
          decodedToken.SessionEndDate = DateHelperService.getServerDateFormat(
            endDate,
            MomentDateFormats.currentDateFormatSlash
          );
        }
        decodedToken.CurrentBranchId = User?.CurrentBranch
          ?.toString();
      }
    } 
    if (decodedToken) {
      decodedToken.UserId = User?.Id;
    }

      currentUser = JSON.stringify(decodedToken);
      //console.log(currentUser);
      let CurrentBranchId = decodedToken.BranchId?.toString();
      //console.log(CurrentBranchId)
    apiClient.setHeader('CurrentUser', `${currentUser}`); 
    apiClient.setHeader('CurrentBranchId', `${CurrentBranchId}`);
    apiClient.setHeader('Authorization', `Bearer ${token}`);
}
};

export default apiClient;
