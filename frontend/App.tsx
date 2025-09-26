import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { UserLogin } from './src/screens/user/models/UserLoginResponse';
import { BranchListResponse } from './src/shared/models/BranchListResponse';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import { useColorScheme } from 'react-native';
import { DefaultTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import UserInactivity from 'react-native-user-inactivity';
import { useNavigation, CommonActions } from '@react-navigation/native';
import UserStorage from './src/auth/user/UserStorage';
import { jwtDecode } from 'jwt-decode';
import sharedApi from './src/shared/services/shared-api';
import apiClient from './src/auth/api-client/api_client';

const App = () => {
  const [User, setUser] = useState<UserLogin | undefined>();
  const [BranchList, setBranchList] = useState<BranchListResponse | undefined>();
  const [SelectedBranch, setSelectedBranch] = useState<string[] | undefined>();
  const [isInactive, setIsInactive] = useState(false);
  const lastActivityRef = useRef<Date>(new Date());
  const countdownRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigationRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : DefaultTheme;  

  const handleLogout = async () => {
    await sharedApi.LogoutUser()
    setUser(undefined);
    setBranchList(undefined);
    setSelectedBranch(undefined);
    UserStorage.deleteUser();

    navigationRef.current?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

const toastConfig = {
  success: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: 'green',
        backgroundColor: '#e6ffed', // light green background
        width: 300,
        alignSelf: 'center',
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
      text1Style={{
        fontSize: 12,
        fontWeight: '600',
        color: 'green',
      }}
    />
  ),

  error: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: 'red',
        backgroundColor: '#ffeaea', // light red background
        width: 300,
        alignSelf: 'center',
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
      text1Style={{
        fontSize: 12,
        fontWeight: '600',
        color: 'red',
      }}
    />
  ),
};


  const checkAndRefreshToken = async () => {
    const token = User?.Token;
    if (token) {
      const decoded: any = jwtDecode(token);
      const expiry = decoded.exp * 1000;
      const now = new Date().getTime();
      const timeLeft = expiry - now;
      const timeSinceLastActivity = (now - lastActivityRef.current.getTime()) / 1000;

      if (timeLeft <= 120000 && timeSinceLastActivity < 1200) {
        try {
          const response = await sharedApi.RefreshToken();
          const NewToken = response?.data?.JWTToken;
          apiClient.setHeader('Authorization', `Bearer ${NewToken}`);
        } catch (error) {
          handleLogout();
        } 
      } 
    }
  };

  const onInactivityChange = (inactive: boolean) => {
    // ⛔ Prevent triggering any idle logic if no user is logged in
    if (!User) return;
  
    setIsInactive(inactive);
  
    if (!inactive) {
      lastActivityRef.current = new Date(); // ✅ Update on activity
    }
  
    if (inactive) {
      countdownRef.current = 30;
  
      Toast.show({
        type: 'info',
        text1: `Logging out in ${countdownRef.current} seconds due to inactivity`,
        visibilityTime: 1000,
        autoHide: true,
      });
  
      intervalRef.current = setInterval(() => {
        countdownRef.current -= 1;
  
        if (countdownRef.current > 0) {
          Toast.show({
            type: 'info',
            text1: `Logging out in ${countdownRef.current} seconds due to inactivity`,
            visibilityTime: 1000,
            autoHide: true,
          });
        } else {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          Toast.hide();
          handleLogout();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      Toast.hide();
    }
  };
  

  // Run refresh token every 1 minute if user is logged in
  useEffect(() => {
    if (User) {
      refreshIntervalRef.current = setInterval(() => {
        checkAndRefreshToken();
      }, 60000); // every 60 seconds
    }

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [User]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: ({ name, size, color }) => (
          <MaterialCommunityIcons name={name as string} size={size} color={color} />
        ),
      }}
    >
      <AuthContext.Provider
        value={{
          User,
          setUser,
          BranchList,
          setBranchList,
          SelectedBranch,
          setSelectedBranch,
        }}
      >
  <UserInactivity
    timeForInactivity={5 * 60 * 1000}
    onAction={(active) => onInactivityChange(!active)}
  >
    <NavigationContainer theme={NavigationTheme} ref={navigationRef}>
      <AuthNavigator />
    </NavigationContainer>
  </UserInactivity>
  <Toast config={toastConfig} position="top" topOffset={0} />
      </AuthContext.Provider>
    </PaperProvider>
  );
};

export default App;
