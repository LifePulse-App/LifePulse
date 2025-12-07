import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { Alert, useColorScheme, View, ActivityIndicator } from 'react-native';
import { DefaultTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import UserInactivity from 'react-native-user-inactivity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import { jwtDecode } from 'jwt-decode';

import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { user } from './src/screens/user/models/UserLoginResponse';
import { BranchListResponse } from './src/shared/models/BranchListResponse';
import UserStorage from './src/auth/user/UserStorage';
import sharedApi from './src/shared/services/shared-api';
import apiClient from './src/auth/api-client/api_client';
import { setSecretKey } from './src/auth/api-client/api_client';
import { navigationRef } from './src/navigation/main/RootNavigation';
import 'react-native-get-random-values';

const App = () => {
  const [User, setUser] = useState<user | undefined>();
  const [BranchList, setBranchList] = useState<BranchListResponse | undefined>();
  const [SelectedBranch, setSelectedBranch] = useState<string[] | undefined>();
  const [isInactive, setIsInactive] = useState(false);
  const lastActivityRef = useRef<Date>(new Date());
  const countdownRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const colorScheme = useColorScheme();

  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);

  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : DefaultTheme;

const secretKeySetRef = useRef(false);

useEffect(() => {
  if (!secretKeySetRef.current) {
    setSecretKey();
    secretKeySetRef.current = true;
  }
}, []);

  const handleLogout = async () => {
    try {
      await sharedApi.LogoutUser();
    } catch {
      // ignore logout API failure
    }

    setUser(undefined);
    setBranchList(undefined);
    setSelectedBranch(undefined);
    await UserStorage.deleteUser();
    await UserStorage.clearTokens?.();

    navigationRef.current?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  const toastConfig = {
    success: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: 'green',
          backgroundColor: '#e6ffed',
          width: '100%',
          alignSelf: 'center',
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
        }}
        text1Style={{
          fontSize: 13,
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
          backgroundColor: '#ffeaea',
          width: '100%',
          alignSelf: 'center',
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
        }}
        text1Style={{
          fontSize: 13,
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
    // do nothing if no user logged in
    if (!User) return;

    setIsInactive(inactive);

    if (!inactive) {
      lastActivityRef.current = new Date();
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
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
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

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
        const savedUser = await UserStorage.getUser();

        if (biometricEnabled === 'true' && savedUser) {
          const rnBiometrics = new ReactNativeBiometrics();

          const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Unlock with Face ID / Fingerprint',
          });

          if (success) {
            // Biometric passed – allow app to render navigation and let Login/AuthNavigator restore the user
            setIsBiometricVerified(true);
          } else {
            // Biometric cancelled/failed -> log out and go to Login
            setIsBiometricVerified(false);
            await UserStorage.deleteUser();
            await UserStorage.clearTokens?.();
            navigationRef.current?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
            );
          }
        } else {
          // No biometric enabled or no saved user – allow navigation normally
          setIsBiometricVerified(true);
        }
      } catch (e) {
        console.log('Biometric check failed:', e);
        setIsBiometricVerified(false);
        await UserStorage.deleteUser();
        await UserStorage.clearTokens?.();
        navigationRef.current?.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          }),
        );
      } finally {
        setIsCheckingBiometric(false);
      }
    };

    checkBiometric();
  }, []);

  // Optional: small splash while checking biometrics
  if (isCheckingBiometric) {
    return (
      <PaperProvider
        theme={theme}
        settings={{
          icon: ({ name, size, color }) => (
            <MaterialCommunityIcons name={name as string} size={size} color={color} />
          ),
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </PaperProvider>
    );
  }

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
        {isBiometricVerified ? (
          <NavigationContainer theme={NavigationTheme} ref={navigationRef}>
            <AuthNavigator />
          </NavigationContainer>
        ) : null}
        <Toast config={toastConfig} position="top" topOffset={5} />
      </AuthContext.Provider>
    </PaperProvider>
  );
};

export default App;