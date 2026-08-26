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
  Modal, // ⚡ ADDED: Modal for success popup
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const SetPassVerifiedOTP = ({ navigation, route }: any) => {
  const styles = loginStyles();

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordMatch, setNewPasswordMatch] = useState('');
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  // ⚡ ADDED: State to control the Success Modal visibility
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  // Optional: identifier/email passed from previous screen
  const email = route?.params?.email;

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

  // ⚡ ADDED: Password Complexity Validation Logic
  const validatePassword = (pass: string) => {
    // Requires at least 8 characters, 1 uppercase letter, and 1 number
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pass);
  };

  const handleVerify = async () => {
    Keyboard.dismiss();

    if (!newPassword || !newPasswordMatch) {
      showError('All fields are required!');
      return;
    }

    if (newPassword !== newPasswordMatch) {
      showError('Passwords do not match!');
      return;
    }

    // ⚡ ADDED: Check against our regex rules before hitting the API
    if (!validatePassword(newPassword)) {
      showError('Password must be at least 8 characters long, include 1 uppercase letter, and 1 number.');
      return;
    }

    setLoading(true);

    try {
      setSecretKey();
      const response = await api_Login.resetPassword(email, newPassword);

      if (!response.ok) {
        setLoading(false);
        navigation.navigate('ForgotPass');
        showError(response.data?.message || 'Process Failed');
        return;
      }

      // const user = response.data as UserLoginResponse;
      // setAuthHeaders(user.accessToken);
      // authContext?.setUser(user);

      // ⚡ TRIGGER SUCCESS MODAL INSTEAD OF IMMEDIATE NAVIGATION
      setSuccessModalVisible(true);

    } catch (e) {
      showError('Unexpected error while changing password');
    } finally {
      setLoading(false);
    }
  };

  // ⚡ ADDED: Function to handle the "Dismiss" button on the success modal
  const handleSuccessDismiss = () => {
    setSuccessModalVisible(false);
    navigation.navigate('Login'); 
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
              <Text style={styles.mainTitle}>Reset Password</Text>
              
              <Text style={localStyles.ruleText}>
                 Must be at least 8 characters, 1 uppercase letter, and 1 number.
              </Text>

              <TextInput
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#fff"
                placeholderTextColor="grey"
                cursorColor='white'
              />

              <TextInput
                placeholder="Confirm Password"
                value={newPasswordMatch}
                onChangeText={setNewPasswordMatch}
                secureTextEntry
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#fff"
                placeholderTextColor="grey"
                cursorColor='white'
              />

              {loading ? (
                <View style={styles.loadingOverlay}>
                  <LoaderKitView
                    style={{ width: 24, height: 24 }}
                    name={'BallSpinFadeLoader'}
                    animationSpeedMultiplier={1.0}
                    color={'#FFFFFF'}
                  />
                  <AppText style={styles.loadingText}>Resetting...</AppText>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleVerify}
                  style={styles.primaryButton}
                >
                  <AppText style={styles.primaryButtonText}>Reset Password</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={hideError}
      />

      {/* ⚡ ADDED: Instagram-style Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={handleSuccessDismiss}
      >
        <View style={localStyles.modalBackground}>
          <View style={localStyles.modalContainer}>
            {/* Success Icon */}
            <View style={localStyles.iconCircle}>
               <Text style={localStyles.iconCheckmark}>✓</Text>
            </View>
            
            <Text style={localStyles.modalTitle}>Password Updated</Text>
            <Text style={localStyles.modalMessage}>
              Your password has been changed successfully. You can now log in with your new password.
            </Text>

            <TouchableOpacity
              style={localStyles.dismissButton}
              onPress={handleSuccessDismiss}
            >
              <Text style={localStyles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
};

// ⚡ ADDED: Local styles for the success modal and rule text
const localStyles = StyleSheet.create({
  ruleText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Instagram dims the background heavily
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#262626', // Instagram dark mode gray
    borderRadius: 14,
    paddingTop: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4ADE80', // Success green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCheckmark: {
    color: '#4ADE80',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#A8A8A8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    lineHeight: 20,
  },
  dismissButton: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: '#363636',
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#0064E0', // Instagram Blue
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SetPassVerifiedOTP;