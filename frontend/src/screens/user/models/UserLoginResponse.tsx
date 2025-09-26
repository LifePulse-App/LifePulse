import { InstituteProfileResponse } from "../../../shared/models/InstituteProfileResponse"

export type UserLoginResponse = UserLogin

export interface UserLogin {
    Id: string
    FirstName: string
    LastName: string
    Email: string
    UserName: string
    PhoneNumber: string
    BranchId: number
    InstituteId: number
    CurrentBranch: number
    Since: string
    RoleName: string
    Token: string
    ImagePath: string
    InstituteRoleId: number
    InstituteProfile: InstituteProfileResponse
    Password: string
  }

  //export type JwtValidatorsResponse = JwtValidators
  
  // export interface JwtValidators {
  //   ApplicationName: string;
  //   DomainName: string;
  // }

  export class JwtValidators {
    ApplicationName: string = "";
    DomainName: string = "";
  }

  export class UserTokenProfile {
    UserId: string = "";
    UserName: string = "";
    SessionStartDate: Date | string = "";
    SessionEndDate: Date | string = "";
    InstituteId: string = "";
    BranchId: string = "";
    CurrentBranchId: string = "";
  }
  