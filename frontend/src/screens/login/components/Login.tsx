import React, { useContext, useEffect, useRef, useState } from 'react';
import Toast from "react-native-toast-message"; // <- you can now remove this import if not used anywhere else
import {
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import DeviceInfo from 'react-native-device-info';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BlurView } from '@react-native-community/blur';
// NEW
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal'; // adjust path as needed

const Login = ({ navigation }: any) => {
  const styles = loginStyles();

  const [check, setCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const authContext = useContext(AuthContext);

  // NEW: local error state instead of Toast
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

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

  const restoreUser = async () => {
    const data = await UserStorage.getUser();
    if (!data) return;

    const objuser = JSON.parse(data.username);
    setUsername(objuser.UserName);
    setPassword(data.password);

    handleSubmit({ username: objuser.UserName, password: data.password });
  };

  useEffect(() => {
    restoreUser();
  }, []);

  // ✅ Email/Password login
  const handleSubmit = async (values: any) => {
    Keyboard.dismiss();
    setLoading(true);

    if (values.username === "" || values.password === "") {
      setLoading(false);
      showError('Email and Password are required!');
      return;
    }

    try {
      setSecretKey();
      const deviceId = await DeviceInfo.getUniqueId();
      const response = await api_Login.getLogin(values.username, values.password, deviceId);

      if (!response.ok) {
        UserStorage.deleteUser();
        authContext?.setUser(null);
        setLoading(false);
        showError(response.data?.message || 'Login failed');
        return;
      }

      const user = response.data as UserLoginResponse;
      user.UserName = values.username;
      user.Password = values.password;
      setAuthHeaders(user.accessToken);

      authContext?.setUser(user);
      if (check) UserStorage.setUser(user);

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
    <View style={styles.container}>
      {/* Animated glassy gradient background */}
      <Animated.View style={[styles.gradientLayer1, blob1Style]} />
      <Animated.View style={[styles.gradientLayer2, blob2Style]} />
      <Animated.View style={[styles.gradientLayer3, blob3Style]} />

      <KeyboardAvoidingView
        style={styles.kbWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BlurView style={styles.glassBlur} blurType="light" blurAmount={5} />

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
              label="Username, Email or Phone No."
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor="#111827"
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
              textColor="#111827"
              placeholderTextColor="#9CA3AF"
            />

            {/* Loader or primary button */}
            {loading ? (
              <View style={styles.loadingOverlay}>
                <LoaderKitView
                  style={{ width: 24, height: 24 }}
                  name={'BallSpinFadeLoader'}
                  animationSpeedMultiplier={1.0}
                  color={"#FFFFFF"}
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

<View style={{ marginTop: 12, alignItems: 'center' }}>
  <Text style={{ color: '#000' }}>
    Don’t have an account?{' '}
    <Text
      style={{ fontWeight: '700', textDecorationLine: 'underline', color: '#fff' }}
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

    {/* Glassy error box */}
    <GlassyErrorModal
      visible={errorVisible}
      message={errorMessage}
      onClose={hideError}
    />
  </>
  );
};

export default Login;