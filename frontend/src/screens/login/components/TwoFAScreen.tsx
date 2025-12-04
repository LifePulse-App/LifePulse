import React, { useContext, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';

import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import AppText from '../../../components/Layout/AppText/AppText';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';
import { loginStyles } from './Loginstyles';
import api_Login from '../services/api_Login';

type RouteParams = {
  twoFaToken: string;
  identifier?: string;
  pass?: string;
};

const TwoFAScreen = () => {
  const styles = loginStyles();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const authContext = useContext(AuthContext);

  const { twoFaToken, identifier, pass } = route.params as RouteParams;

  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleVerify = async () => {
    Keyboard.dismiss();

    if (!code && !backupCode) {
      showError('Enter either your 6-digit code or a backup code');
      return;
    }

    setLoading(true);
    try {
      setSecretKey();

      const response = await api_Login.verify2faLogin(twoFaToken, code || undefined, backupCode || undefined);

      if (!response.ok) {
        showError((response as any).data?.message || '2FA verification failed');
        return;
      }

      const data: any = response.data;

      // data contains: success, accessToken, refreshToken, user, usedBackupCode
      const user = data as any;

      // attach identifier for UI if desired
      if (identifier) {
        user.UserName = identifier;
        user.Password = pass
      }

      if (user.accessToken) {
        setAuthHeaders(user.accessToken);
      }

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
    } catch (e: any) {
      showError('Unexpected error during 2FA verification');
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.mainTitle}>Two-Factor Authentication</Text>
              <Text style={styles.mainSubtitle}>
                Enter the 6-digit code from your authenticator app or a backup code.
              </Text>

              <TextInput
                label="6-digit 2FA code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                keyboardType="numeric"
                maxLength={6}
                textColor="black"
              />

              <Text
                style={{
                  textAlign: 'center',
                  marginVertical: 8,
                  color: 'black',
                }}
              >
                OR
              </Text>

              <TextInput
                label="Backup Code"
                value={backupCode}
                onChangeText={setBackupCode}
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="black"
                placeholder="XXXX-XXXX-XX"
                autoCapitalize="characters"
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
                <TouchableOpacity onPress={handleVerify} style={styles.primaryButton}>
                  <AppText style={styles.primaryButtonText}>Verify</AppText>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 8, alignItems: 'center' }}>
                <Text style={{ color: 'black', fontSize: 12 }}>
                  Lost access to your authenticator app? Use one of your backup codes.
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage || ''}
        onClose={hideError}
      />
    </>
  );
};

export default TwoFAScreen;