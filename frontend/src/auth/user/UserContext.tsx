import React from 'react';
import { UserLoginResponse } from '../../screens/user/models/UserLoginResponse';
import { BranchListResponse } from '../../shared/models/BranchListResponse';

interface IUser{
    User: UserLoginResponse | undefined; 
    BranchList: BranchListResponse | undefined;
    SelectedBranch: string[] | undefined;
    setUser: React.Dispatch<any>;
    setBranchList: React.Dispatch<any>;
    setSelectedBranch: React.Dispatch<any>;
}

const AuthContext = React.createContext<IUser | null>(null);

export default AuthContext;