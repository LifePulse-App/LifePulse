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
import { CommonActions } from '@react-navigation/native';

const Login = ({ navigation }: any) => {
  const styles = loginStyles();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // show characters by default
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

      const storedUser: UserLoginResponse = JSON.parse(creds.username);

      if (storedUser.UserName) setUsername(storedUser.UserName);
      if (creds.password) setPassword(creds.password);

      if (storedUser.accessToken) {
        setAuthHeaders(storedUser.accessToken);
        authContext?.setUser(storedUser);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Drawer' }],
          }),
        );
      }
    } catch (e) {
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
      const deviceName = await DeviceInfo.getDeviceName();
      const deviceModel = DeviceInfo.getModel();
      const deviceBrand = DeviceInfo.getBrand();
      const response = await api_Login.getLogin(
        values.username,
        values.password,
        deviceId,
        deviceName,
        deviceModel,
        deviceBrand,
      );

      if (!response.ok) {
        await UserStorage.deleteUser();
        authContext?.setUser(null);
        showError(response.data?.message || 'Login failed');
        return;
      }

      const data = response.data as any;

      if (data.requires2fa) {
        navigation.navigate('TwoFA', {
          twoFaToken: data.twoFaToken,
          identifier: values.username,
          pass: values.password
        });
        return;
      }

      const user = data as UserLoginResponse;
      user.UserName = values.username;
      user.Password = values.password;

      setAuthHeaders(user.accessToken);
      authContext?.setUser(user);
      await UserStorage.setUser(user);

      if (user.accessToken) {
        await UserStorage.setAccessToken(user.accessToken);
      }
      if (user.refreshToken) {
        await UserStorage.setRefreshToken(user.refreshToken);
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Drawer' }],
        }),
      );
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
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <KeyboardAvoidingView
          style={styles.kbWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

          <View style={styles.appNameWrapper}>
            <Text style={styles.appName}>StreakSphere</Text>
          </View>

          <View style={styles.glassWrapper}>
            <View style={styles.glassContent}>
              <Text style={styles.mainTitle}>Welcome Back</Text>
              <Text style={styles.mainSubtitle}>
                To Login, Enter Credentials Below...
              </Text>

              <TextInput
                label="Username or Email"
                placeholder="Username or Email"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="black"
                placeholderTextColor="grey"
                cursorColor='black'
              />

              <TextInput
                label="Password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}   // keep visible when showPassword is true
                autoCorrect={false}
                autoCapitalize="none"
                textContentType="password"
                autoComplete="password"
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="black"
                placeholderTextColor="grey"
                cursorColor='black'
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword((prev) => !prev)}
                  />
                }
              />

              {loading ? (
                <View style={styles.loadingOverlay}>
                  <LoaderKitView
                    style={{ width: 20, height: 20 }}
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
                <Text style={{ color: 'black', fontSize: 13 }}>
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
                <Text style={{ color: 'black', fontSize: 13 }}>
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

              <Text style={styles.termsText}>
                By logging in or continuing, you agree to our Terms of Service
                and Privacy Policy
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

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