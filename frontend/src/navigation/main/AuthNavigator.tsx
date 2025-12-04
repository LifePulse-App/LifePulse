import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../../screens/login/components/Login';
import DrawerNavigator from '../../screens/drawer/DrawerNavigator';
import Register from '../../screens/login/components/Register';
import VerifyOtp from '../../screens/login/components/VerifyOTP';
import ResetPassVerifyOTP from '../../screens/login/components/ResetPassVerifyOTP';
import SetPassVerifiedOTP from '../../screens/login/components/SetPass';
import ForgotPass from '../../screens/login/components/ForgotPass';

import UserStorage from '../../auth/user/UserStorage';
import { UserLoginResponse } from '../../screens/user/models/UserLoginResponse';
import AuthContext from '../../auth/user/UserContext';
import { setAuthHeaders, setSecretKey } from '../../auth/api-client/api_client';
import MoodScreen from '../../screens/moodscreen/comp/component/MoodScreen';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import ProofVisionCameraScreen from '../../screens/proof-camera/Camera';
import Friends from '../../screens/friends/components/Friends';
import EditProfileScreen from '../../screens/profile/components/EditProfile';
import TwoFAScreen from '../../screens/login/components/TwoFAScreen';
import Enable2FAScreen from '../../screens/profile/components/Enable2FaScreen';
import DevicesScreen from '../../screens/profile/components/DevicesScreen';

const Stack = createNativeStackNavigator();
const { width, height } = Dimensions.get('window');

// Simple splash screen with dashboard-like background
const SplashScreen = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (animatedValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 9000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 9000,
            useNativeDriver: true,
          }),
        ]),
      );

    makeLoop(anim1, 0).start();
    makeLoop(anim2, 1500).start();
    makeLoop(anim3, 3000).start();
  }, [anim1, anim2, anim3]);

  const blob1Style = {
    transform: [
      {
        translateX: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 40],
        }),
      },
      {
        translateY: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 30],
        }),
      },
    ],
  };

  const blob2Style = {
    transform: [
      {
        translateX: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [30, -30],
        }),
      },
      {
        translateY: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -20],
        }),
      },
    ],
  };

  const blob3Style = {
    transform: [
      {
        translateX: anim3.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 20],
        }),
      },
      {
        translateY: anim3.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 10],
        }),
      },
    ],
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#020617',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Glowy background blobs similar to dashboard/login */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * 1.6,
            height: width * 1.6,
            borderRadius: width * 0.8,
            backgroundColor: 'rgba(59, 130, 246, 0.35)',
            top: -width * 0.6,
            left: -width * 0.3,
          },
          blob1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * 1.4,
            height: width * 1.4,
            borderRadius: width * 0.7,
            backgroundColor: 'rgba(168, 85, 247, 0.35)',
            bottom: -width * 0.5,
            right: -width * 0.4,
          },
          blob2Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * 1.2,
            height: width * 1.2,
            borderRadius: width * 0.6,
            backgroundColor: 'rgba(37, 99, 235, 0.25)',
            top: height * 0.3,
            right: -width * 0.5,
          },
          blob3Style,
        ]}
      />

      {/* Centered logo + app name */}
      <View style={{ alignItems: 'center' }}>
        {/* Replace with your logo Image if you have one */}
        {/* <Image source={require('path/to/logo.png')} style={{ width: 80, height: 80, marginBottom: 16 }} /> */}
        <Text
          style={{
            fontSize: 30,
            fontWeight: '800',
            color: '#F9FAFB',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          StreakSphere
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#9CA3AF',
            marginBottom: 20,
          }}
        >
          Loading your experience...
        </Text>
      </View>
    </View>
  );
};

const AuthNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Drawer' | null>(null);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Ensure static api-key is always set
        setSecretKey();

        const creds = await UserStorage.getUser();
        if (!creds || !creds.username) {
          setInitialRoute('Login');
          return;
        }

        const storedUser: UserLoginResponse = JSON.parse(creds.username);
        const accessToken =
          (await UserStorage.getAccessToken()) || storedUser.accessToken;

        if (!accessToken) {
          await UserStorage.deleteUser();
          await UserStorage.clearTokens?.();
          setInitialRoute('Login');
          return;
        }

        // Restore session
        await setAuthHeaders(accessToken);
        authContext?.setUser?.(storedUser);
        setInitialRoute('Drawer');
      } catch (e) {
        await UserStorage.deleteUser();
        await UserStorage.clearTokens?.();
        setInitialRoute('Login');
      }
    };

    bootstrap();
  }, [authContext]);

  // Show splash while deciding where to go
  if (!initialRoute) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="TwoFA" component={TwoFAScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
      <Stack.Screen name="ForgotPass" component={ForgotPass} />
      <Stack.Screen name="ResetPassVerifyOtp" component={ResetPassVerifyOTP} />
      <Stack.Screen name="SetPass" component={SetPassVerifiedOTP} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="Drawer" component={DrawerNavigator} />
      <Stack.Screen name="MoodScreen" component={MoodScreen} />
      <Stack.Screen name="ProofCamera" component={ProofVisionCameraScreen} />
      <Stack.Screen name="Friends" component={Friends} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Enable2FA" component={Enable2FAScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;