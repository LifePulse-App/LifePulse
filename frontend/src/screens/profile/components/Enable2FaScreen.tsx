import React, { useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { loginStyles } from '../../login/components/Loginstyles';
import api_Login from '../../login/services/api_Login';
import AppText from '../../../components/Layout/AppText/AppText';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const Enable2FAScreen = () => {
  const styles = loginStyles();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

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

  // Step 1: init 2FA (get QR + manual key)
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api_Login.init2fa();
        if (!res.ok) {
          showError((res as any).data?.message || 'Failed to start 2FA setup');
          return;
        }
        const data: any = res.data;
        setQrImage(data.qrImageDataUrl);
        setManualKey(data.manualKey);
      } catch (e: any) {
        showError('Unable to initialize 2FA. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  const handleConfirm = async () => {
    Keyboard.dismiss();
    if (!code) {
      showError('Please enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    try {
      const res = await api_Login.confirm2fa(code);
      if (!res.ok) {
        showError((res as any).data?.message || 'Invalid 2FA code');
        return;
      }

      const data: any = res.data;
      if (data.backupCodes && Array.isArray(data.backupCodes)) {
        setBackupCodes(data.backupCodes);
      }
    } catch (e: any) {
      showError('Failed to confirm 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    // You can simply go back or to settings
    navigation.goBack();
  };

  if (initialLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <LoaderKitView
          style={{ width: 40, height: 40 }}
          name={'BallSpinFadeLoader'}
          animationSpeedMultiplier={1.0}
          color={'#FFFFFF'}
        />
        <AppText style={{ marginTop: 12, color: '#FFFFFF' }}>Preparing 2FA setup...</AppText>
      </View>
    );
  }

  // If backup codes generated, show them and a "Done" button
  if (backupCodes) {
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
                <Text style={styles.mainTitle}>2FA Enabled</Text>
                <Text style={styles.mainSubtitle}>
                  Save these backup codes somewhere safe. Each code can be used once if you lose
                  access to your authenticator app.
                </Text>

                <ScrollView
                  style={{ maxHeight: 240, marginVertical: 10 }}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {backupCodes.map((code, idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 15 }}>{code}</Text>
                    </View>
                  ))}
                </ScrollView>

                <Text style={{ color: '#000', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                  You will not be able to see these codes again. Store them in a secure place.
                </Text>

                <TouchableOpacity onPress={handleDone} style={styles.primaryButton}>
                  <AppText style={styles.primaryButtonText}>Done</AppText>
                </TouchableOpacity>
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
  }

  // Default view: QR + manual key + code input
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
              <Text style={styles.mainTitle}>Enable Two-Factor Auth</Text>
              <Text style={styles.mainSubtitle}>
                Scan the QR code below with Google Authenticator, iOS Passwords, or another
                authenticator app.
              </Text>

              {qrImage && (
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Image
                    source={{ uri: qrImage }}
                    style={{ width: 200, height: 200, borderRadius: 12, backgroundColor: '#fff' }}
                    resizeMode="contain"
                  />
                </View>
              )}

              {manualKey && (
                <View
                  style={{
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: '600', marginBottom: 4 }}>
                    Or enter this key manually:
                  </Text>
                  <Text selectable style={{ color: '#000', fontSize: 14 }}>
                    {manualKey}
                  </Text>
                </View>
              )}

              <Text style={{ color: '#000', fontSize: 13, marginBottom: 6 }}>
                After adding your account to the authenticator app, enter the 6-digit code it shows:
              </Text>

              <TextInput
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                style={styles.passwordInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                keyboardType="numeric"
                maxLength={6}
                textColor="black"
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
                <TouchableOpacity onPress={handleConfirm} style={styles.primaryButton}>
                  <AppText style={styles.primaryButtonText}>Confirm & Enable</AppText>
                </TouchableOpacity>
              )}
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

export default Enable2FAScreen;