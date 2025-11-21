import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';

import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import DeviceInfo from 'react-native-device-info';
import { BlurView } from '@react-native-community/blur';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const Login = ({ navigation }: any) => {
  const styles = loginStyles();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const authContext = useContext(AuthContext);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [offline, setOffline] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  // ---------- NetInfo: connectivity ----------
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline =
        !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ---------- Animated values for glassy background ----------
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

  // ---------- Restore user from Keychain (NO login API here) ----------
  const restoreUser = async () => {
    try {
      const creds = await UserStorage.getUser();
      if (!creds || !creds.username) return;

      // creds.username is JSON.stringify(UserLoginResponse)
      const storedUser: UserLoginResponse = JSON.parse(creds.username);

      // Prefill fields (optional)
      if (storedUser.UserName) setUsername(storedUser.UserName);
      // creds.password is the saved password; you can prefill if you want
      if (creds.password) setPassword(creds.password);

      if (storedUser.accessToken) {
        // Use existing token: set headers + context, then go in app
        setAuthHeaders(storedUser.accessToken);
        authContext?.setUser(storedUser);
        navigation.navigate('Drawer');
      }
    } catch (e) {
      // Any error: clear stored user
      await UserStorage.deleteUser();
    }
  };

  useEffect(() => {
    restoreUser();
  }, []);

  // ---------- Email/Password login (ONLY here you hit API) ----------
  const handleSubmit = async (values: { username: string; password: string }) => {
    Keyboard.dismiss();

    if (offline) {
      showError("You’re offline. Please connect to the internet and try again.");
      return;
    }

    if (!values.username || !values.password) {
      showError('Email and Password are required!');
      return;
    }

    setLoading(true);

    try {
      setSecretKey();
      const deviceId = await DeviceInfo.getUniqueId();
      const response = await api_Login.getLogin(
        values.username,
        values.password,
        deviceId,
      );

      if (!response.ok) {
        await UserStorage.deleteUser();
        authContext?.setUser(null);
        showError(response.data?.message || 'Login failed');
        return;
      }

      const user = response.data as UserLoginResponse;
      user.UserName = values.username;
      user.Password = values.password;

      // 1) Set auth header for current session
    setAuthHeaders(user.accessToken);

    // 2) Save full user for auto-login UI/context
    authContext?.setUser(user);
    await UserStorage.setUser(user);

    // 3) Save tokens for interceptors
if (user.accessToken) {
  await UserStorage.setAccessToken(user.accessToken);
}
if (user.refreshToken) {
  await UserStorage.setRefreshToken(user.refreshToken);
}
    
    navigation.navigate('Drawer');
    } catch (e) {
      showError('Unexpected error while logging in');
    } finally {
      setLoading(false);
    }
  };

  // Interpolated transforms for subtle motion
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
    <>
      <View style={styles.root}>
      {/* Dashboard-like background */}
      <View style={styles.baseBackground} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.kbWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

          {/* Top app name */}
          <View style={styles.appNameWrapper}>
            <Text style={styles.appName}>StreakSphere</Text>
          </View>

          {/* Glassy card */}
          <View style={styles.glassWrapper}>
            <View style={styles.glassContent}>
              <Text style={styles.mainTitle}>Welcome Back</Text>
              <Text style={styles.mainSubtitle}>
                To Login, Enter Credentials Below...
              </Text>

              {/* Identifier */}
              <TextInput
                label="Username or Email"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="black"
                placeholderTextColor="#9CA3AF"
              />

              {/* Password */}
              <TextInput
                label="Password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="black"
                placeholderTextColor="#9CA3AF"
              />

              {/* Loader or primary button */}
              {loading ? (
                <View style={styles.loadingOverlay}>
                  <LoaderKitView
                    style={{ width: 24, height: 24 }}
                    name={'BallSpinFadeLoader'}
                    animationSpeedMultiplier={1.0}
                    color={'#FFFFFF'}
                  />
                  <AppText style={styles.loadingText}>Logging in...</AppText>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleSubmit({ username, password })}
                  style={styles.primaryButton}
                >
                  <AppText style={styles.primaryButtonText}>Continue</AppText>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 4, alignItems: 'center' }}>
                <Text style={{ color: 'black' }}>
                  Want to reset password?{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      color: '#F9FAFB',
                    }}
                    onPress={() => navigation.navigate('ForgotPass')}
                  >
                    Forget Password
                  </Text>
                </Text>
              </View>

              <View style={{ marginTop: 5, alignItems: 'center' }}>
                <Text style={{ color: 'black' }}>
                  Don’t have an account?{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      color: '#F9FAFB',
                    }}
                    onPress={() => navigation.navigate('Register')}
                  >
                    Register
                  </Text>
                </Text>
              </View>

              {/* Terms */}
              <Text style={styles.termsText}>
                By logging in or continuing, you agree to our Terms of Service
                and Privacy Policy
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Glassy error box – also used for offline */}
      <GlassyErrorModal
        visible={errorVisible || offline}
        message={
          offline && !errorMessage
            ? "You’re offline. Please connect to the internet and try again."
            : errorMessage || ''
        }
        onClose={hideError}
      />
    </>
  );
};

export default Login;