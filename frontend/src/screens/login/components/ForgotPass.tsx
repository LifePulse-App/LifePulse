import React, { useContext, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import DeviceInfo from 'react-native-device-info';
import { BlurView } from '@react-native-community/blur';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const ForgotPass = ({ navigation, route }: any) => {
  const styles = loginStyles();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  // toast-like message for success / info
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
    setToastMessage(null);
  };


  // background animations (same as login/register)
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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

  const handle = async () => {
    Keyboard.dismiss();
    setLoading(true);

    if (!identifier) {
      setLoading(false);
      showError('Please enter your email or username.');
      return;
    }

    try {
      setSecretKey();
      const response = await api_Login.forgotPass(identifier);

      if (!response.ok) {
        setLoading(false);
        showError(response.data?.message || 'Failed to process');
        return;
      }

      navigation.navigate('ResetPassVerifyOtp', { identifier });
    } catch (e) {
      showError('Unexpected error');
    } finally {
      setLoading(false);
    }
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

          <View style={styles.appNameWrapper}>
            <Text style={styles.appName}>StreakSphere</Text>
          </View>

          <View style={styles.glassWrapper}>
            <View style={styles.glassContent}>
              <Text style={styles.mainTitle}>Forget Password</Text>
              <Text style={styles.mainSubtitle}>
                Enter Email or Username of your account.
              </Text>

              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                style={styles.input}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#111827"
                placeholderTextColor="#9CA3AF"
              />

              {loading ? (
                <View style={styles.loadingOverlay}>
                  <LoaderKitView
                    style={{ width: 24, height: 24 }}
                    name={'BallSpinFadeLoader'}
                    animationSpeedMultiplier={1.0}
                    color={'#FFFFFF'}
                  />
                  <AppText style={styles.loadingText}>Verifying...</AppText>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handle}
                  style={styles.primaryButton}
                >
                  <AppText style={styles.primaryButtonText}>Continue</AppText>
                </TouchableOpacity>
              )}
              <View style={{ marginTop: 2, alignItems: 'center' }}>
  <Text style={{ color: '#000' }}>
    Already have an account?{' '}
    <Text
      style={{ fontWeight: '700', textDecorationLine: 'underline', color: '#fff' }}
      onPress={() => navigation.navigate('Login')}
    >
      Login
    </Text>
  </Text>
</View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Error modal (already present) */}
      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={hideError}
      />

      {/* Toast-style info modal (reuse same component; you can style it differently if it supports it) */}
      <GlassyErrorModal
        visible={toastVisible}
        message={toastMessage}
        onClose={hideToast}
      />
    </>
  );
};

export default ForgotPass;