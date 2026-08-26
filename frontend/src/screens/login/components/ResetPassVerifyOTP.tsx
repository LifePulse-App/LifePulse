import React, { useContext, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
  Image,
  StyleSheet,
  TextInput as RNTextInput, // ⚡ ADDED: Native text input for the hidden overlay
} from 'react-native';
import { Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import DeviceInfo from 'react-native-device-info';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const OTP_LENGTH = 6;

const ResetPassVerifyOTP = ({ navigation, route }: any) => {
  const styles = loginStyles();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  // toast-like message for success / info
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // ⚡ ADDED: Ref for the hidden input to force focus
  const inputRef = useRef<RNTextInput>(null);

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

  // Optional: identifier/email passed from previous screen
  const email = route?.params?.identifier;

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

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    setLoading(true);

    if (!otp || otp.length < OTP_LENGTH) {
      setLoading(false);
      showError('Please enter the full 6-digit code.');
      return;
    }

    try {
      setSecretKey();
      const response = await api_Login.verifyResetPassOtp(email, otp);

      if (!response.ok) {
        setLoading(false);
        showError(response.data?.message || 'OTP verification failed');
        return;
      }

      navigation.navigate('SetPass', { email });
    } catch (e) {
      showError('Unexpected error while verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.root}>
        {/* Dashboard-like background */}
        <View style={styles.baseBackground} />

        <KeyboardAvoidingView
          style={styles.kbWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.appNameWrapper}>
            {/* --- REPLACED TEXT WITH LOGO IMAGE --- */}
            <Image 
              source={require('../../../shared/bootsplash/logo-bg.png')} 
              style={{ width: 180, height: 100, alignSelf: 'center', marginBottom: 0 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.glassWrapper}>
            <View style={styles.glassContent}>
              <Text style={styles.mainTitle}>Verify OTP</Text>
              <Text style={styles.mainSubtitle}>
                Enter the 6-digit code we emailed to you
              </Text>

              {/* ⚡ ADDED: Visual 6-Block OTP Input */}
              <View style={otpStyles.otpContainer}>
                <RNTextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setOtp(numericValue);
                    if (numericValue.length === OTP_LENGTH) {
                      Keyboard.dismiss();
                    }
                  }}
                  maxLength={OTP_LENGTH}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode" // iOS Autofill
                  autoComplete="sms-otp"        // Android Autofill
                  autoFocus={true}
                  caretHidden={true}
                  style={otpStyles.hiddenInput}
                />
                
                <View style={otpStyles.cellsWrapper} pointerEvents="none">
                  {Array(OTP_LENGTH)
                    .fill(0)
                    .map((_, index) => {
                      const digit = otp[index] || '';
                      // Highlight the cell that is currently waiting for input
                      const isCurrentCell = index === otp.length;

                      return (
                        <View
                          key={index}
                          style={[
                            otpStyles.cell,
                            isCurrentCell && otpStyles.cellFocused,
                            digit ? otpStyles.cellFilled : null
                          ]}
                        >
                          <Text style={otpStyles.cellText}>{digit}</Text>
                        </View>
                      );
                    })}
                </View>
              </View>
              {/* ⚡ END OF OTP BLOCKS */}

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
                  onPress={handleVerifyOtp}
                  style={styles.primaryButton}
                >
                  <AppText style={styles.primaryButtonText}>Continue</AppText>
                </TouchableOpacity>
              )}

              <Text style={styles.termsText} numberOfLines={2}>
                Didn’t receive the code? Check your spam folder or wait a few
                moments.
              </Text>
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

      {/* Toast-style info modal */}
      <GlassyErrorModal
        visible={toastVisible}
        message={toastMessage}
        onClose={hideToast}
      />
    </>
  );
};

// ⚡ ADDED: Local styles specifically for the OTP layout
const otpStyles = StyleSheet.create({
  otpContainer: {
    width: '100%',
    height: 60,
    marginVertical: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 999, // Ensures tapping anywhere on the blocks pulls up the keyboard
  },
  cellsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  cell: {
    width: 48,
    height: 58,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFocused: {
    borderColor: '#6366f1', // StreakSphere primary indigo
    borderWidth: 2,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  cellFilled: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  cellText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
});

export default ResetPassVerifyOTP;