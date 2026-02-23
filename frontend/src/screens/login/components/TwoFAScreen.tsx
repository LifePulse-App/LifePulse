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

type Mode = 'totp' | 'backup';

const TwoFAScreen = () => {
  const styles = loginStyles();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const authContext = useContext(AuthContext);

  const { twoFaToken, identifier, pass } = route.params as RouteParams;

  const [mode, setMode] = useState<Mode>('totp'); // 'totp' or 'backup'
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

    const selectedCode = mode === 'totp' ? code : backupCode;
    if (!selectedCode) {
      showError(
        mode === 'totp'
          ? 'Please enter your 6-digit code.'
          : 'Please enter your backup code.',
      );
      return;
    }

    setLoading(true);
    try {
      setSecretKey();

      const response = await api_Login.verify2faLogin(
        twoFaToken,
        mode === 'totp' ? selectedCode : undefined,
        mode === 'backup' ? selectedCode : undefined,
      );

      if (!response.ok) {
        showError((response as any).data?.message || '2FA verification failed');
        return;
      }

      const data: any = response.data;

      const user = data as any;

      if (identifier) {
        user.UserName = identifier;
        user.Password = pass;
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

  const renderModeToggle = () => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 12,
        marginTop: 6,
      }}
    >
      <TouchableOpacity
        onPress={() => setMode('totp')}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderTopLeftRadius: 999,
          borderBottomLeftRadius: 999,
          borderWidth: 1,
          borderColor: mode === 'totp' ? '#111827' : 'rgba(148,163,184,1)',
          backgroundColor:
            mode === 'totp' ? '#111827' : 'rgba(148,163,184,0.15)',
        }}
      >
        <Text
          style={{
            color: mode === 'totp' ? '#F9FAFB' : '#111827',
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          Use 2FA code
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('backup')}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderTopRightRadius: 999,
          borderBottomRightRadius: 999,
          borderWidth: 1,
          borderLeftWidth: 0,
          borderColor: mode === 'backup' ? '#111827' : 'rgba(148,163,184,1)',
          backgroundColor:
            mode === 'backup' ? '#111827' : 'rgba(148,163,184,0.15)',
        }}
      >
        <Text
          style={{
            color: mode === 'backup' ? '#F9FAFB' : '#111827',
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          Use backup code
        </Text>
      </TouchableOpacity>
    </View>
  );

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
                Enter your 6-digit authenticator code or use a backup code to continue.
              </Text>

              {renderModeToggle()}

              {mode === 'totp' ? (
                <>
                  <TextInput
                    label="6-digit 2FA code"
                    placeholder="6-digit 2FA code"
                    value={code}
                    onChangeText={setCode}
                    style={styles.input}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    keyboardType="numeric"
                    maxLength={6}
                    textColor="black"
                    placeholderTextColor="grey"
                    cursorColor='black'
                  />
                </>
              ) : (
                <>
                  <TextInput
                    label="Backup Code"
                    placeholder="Backup Code"
                    value={backupCode}
                    onChangeText={setBackupCode}
                    style={styles.passwordInput}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    textColor="black"
                    placeholder="XXXX-XXXX-XX"
                    autoCapitalize="characters"
                    placeholderTextColor="grey"
                    cursorColor='black'
                  />
                </>
              )}

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
                {mode === 'totp' ? (
                  <Text style={{ color: 'black', fontSize: 12 }}>
                    Lost access to your authenticator app? Switch to backup code above.
                  </Text>
                ) : (
                  <Text style={{ color: 'black', fontSize: 12 }}>
                    Backup codes are one-time use. Keep them in a safe place.
                  </Text>
                )}
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