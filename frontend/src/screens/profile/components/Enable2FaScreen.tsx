import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Text } from '@rneui/themed';
import { TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import { loginStyles } from '../../login/components/Loginstyles';
import api_Login from '../../login/services/api_Login';
import AppText from '../../../components/Layout/AppText/AppText';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const TWO_FA_CACHE_KEY = 'settings:2fa:setup:v1';

const Enable2FAScreen = () => {
  const styles = loginStyles();
  const navigation = useNavigation<any>();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  const [disableMode, setDisableMode] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableBackupCode, setDisableBackupCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // FIX 1: Use a ref for offline status so load2FASetup always reads the latest
  // value synchronously — avoids stale closure on first render.
  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };
  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  // FIX 2: Set up NetInfo listener AND fetch initial network state immediately
  // on mount so offlineRef is populated before load2FASetup runs.
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });

    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const load2FASetup = useCallback(async () => {
    // FIX 3: Always load cache first, unconditionally — before any online/offline checks.
    // This guarantees cached QR/key is shown immediately regardless of network state.
    let hasCachedData = false;
    try {
      const raw = await AsyncStorage.getItem(TWO_FA_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.qrImage) {
          setQrImage(parsed.qrImage);
          hasCachedData = true;
        }
        if (parsed?.manualKey) setManualKey(parsed.manualKey);
        if (hasCachedData) setInitialLoading(false); // Show cached data instantly.
      }
    } catch {}

    // FIX 4: Read offlineRef.current synchronously instead of offline state
    // to avoid stale closure where offline is still false on first render.
    if (offlineRef.current) {
      if (!hasCachedData) setInitialLoading(false);
      // Cache already set above if available — nothing more to do offline.
      return;
    }

    // Online path: fetch live 2FA setup data.
    setInitialLoading(true);
    try {
      const res = await api_Login.init2fa();
      if (!res.ok) {
        // FIX 5: On API error, keep cache already set above — don't clear state.
        if (!hasCachedData) {
          showError((res as any).data?.message || 'Failed to start 2FA setup');
        }
        setInitialLoading(false);
        return;
      }

      const data: any = res.data;

      // FIX 6: Guard against undefined API response — don't overwrite good cache.
      if (!data?.qrImageDataUrl && !data?.manualKey) {
        console.log('[2FA] API returned no setup data — keeping cache.');
        setInitialLoading(false);
        return;
      }

      if (data.qrImageDataUrl) setQrImage(data.qrImageDataUrl);
      if (data.manualKey) setManualKey(data.manualKey);

      await AsyncStorage.setItem(
        TWO_FA_CACHE_KEY,
        JSON.stringify({
          qrImage: data.qrImageDataUrl,
          manualKey: data.manualKey,
          ts: Date.now(),
        })
      );
    } catch (e: any) {
      // FIX 7: On error, keep the cache already set above — don't clear state.
      console.log('[2FA] load2FASetup error — keeping cache:', e?.message);
      if (!hasCachedData) {
        showError('Unable to initialize 2FA. Please try again.');
      }
    } finally {
      setInitialLoading(false);
    }
  }, []); // FIX 8: No `offline` dependency — uses ref instead.

  // FIX 9: Single clean mount effect.
  useEffect(() => {
    load2FASetup();
  }, [load2FASetup]);

  // FIX 10: Re-fetch when coming back online so live QR replaces cached one.
  useEffect(() => {
    if (!offline) {
      load2FASetup();
    }
  }, [offline]); // intentionally only triggers on offline toggle

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
        // Clear setup cache now that 2FA is enabled.
        await AsyncStorage.removeItem(TWO_FA_CACHE_KEY);
      }
    } catch {
      showError('Failed to confirm 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  const handleDisable2FA = async () => {
    Keyboard.dismiss();

    if (!disablePassword) {
      showError('Please enter your current password');
      return;
    }
    if (!disableCode && !disableBackupCode) {
      showError('Enter either 6-digit 2FA code or a backup code to disable');
      return;
    }

    setDisableLoading(true);
    try {
      const res = await api_Login.disable2fa(
        disablePassword,
        disableCode || undefined,
        disableBackupCode || undefined,
      );
      if (!res.ok) {
        showError((res as any).data?.message || 'Failed to disable 2FA');
        return;
      }
      await AsyncStorage.removeItem(TWO_FA_CACHE_KEY);
      navigation.goBack();
    } catch {
      showError('Failed to disable 2FA. Please try again.');
    } finally {
      setDisableLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 30 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          width: 40, height: 40, borderRadius: 16,
          backgroundColor: 'rgba(15,23,42,0.0)',
          borderWidth: 1, borderColor: 'rgba(148,163,184,0.4)',
          justifyContent: 'center', alignItems: 'center', marginLeft: 4,
        }}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={{
        flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700',
        color: '#F9FAFB', marginRight: 40,
      }}>
        Two-factor Auth
      </Text>
    </View>
  );

  const renderDisableSection = () => (
    <>
      <TouchableOpacity
        onPress={() => setDisableMode(!disableMode)}
        style={[styles.secondaryButton, { marginTop: 16 }]}
      >
        <AppText style={styles.secondaryButtonText}>
          {disableMode ? 'Cancel disable 2FA' : 'Disable 2FA'}
        </AppText>
      </TouchableOpacity>

      {disableMode && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: '#000', fontSize: 13, marginBottom: 6 }}>
            To disable 2FA, confirm with your password and a 2FA code or backup code.
          </Text>

          <TextInput
            label="Current Password"
            value={disablePassword}
            onChangeText={setDisablePassword}
            style={styles.passwordInput}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            secureTextEntry
            textColor="black"
            cursorColor='black'
          />

          <TextInput
            label="6-digit 2FA code (optional)"
            value={disableCode}
            onChangeText={setDisableCode}
            style={styles.passwordInput}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            keyboardType="numeric"
            maxLength={6}
            textColor="black"
            cursorColor='black'
          />

          <TextInput
            label="Backup code (optional)"
            value={disableBackupCode}
            onChangeText={setDisableBackupCode}
            style={styles.passwordInput}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            textColor="black"
            placeholder="XXXX-XXXX-XX"
            autoCapitalize="characters"
            cursorColor='black'
          />

          <TouchableOpacity
            onPress={handleDisable2FA}
            style={[styles.primaryButton, { backgroundColor: '#ef4444', marginTop: 8 }]}
            disabled={disableLoading}
          >
            {disableLoading ? (
              <LoaderKitView
                style={{ width: 24, height: 24 }}
                name={'BallSpinFadeLoader'}
                animationSpeedMultiplier={1.0}
                color={'#FFFFFF'}
              />
            ) : (
              <AppText style={styles.primaryButtonText}>Confirm Disable 2FA</AppText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  if (initialLoading && !qrImage && !manualKey) {
    return (
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <LoaderKitView
          style={{ width: 40, height: 40, marginTop: 80 }}
          name={'BallSpinFadeLoader'}
          animationSpeedMultiplier={1.0}
          color={'#FFFFFF'}
        />
        <AppText style={{ marginTop: 18, color: '#FFFFFF', fontSize: 16 }}>
          Preparing 2FA setup...
        </AppText>
      </View>
    );
  }

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
            {renderHeader()}

            <View style={styles.glassWrapper}>
              <View style={styles.glassContent}>
                <Text style={styles.mainTitle}>2FA Enabled</Text>
                <Text style={styles.mainSubtitle}>
                  Save these backup codes somewhere safe. Each code can be used
                  once if you lose access to your authenticator app.
                </Text>

                <ScrollView
                  style={{ maxHeight: 300, marginVertical: 10 }}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {backupCodes.map((bc, idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 15 }}>{bc}</Text>
                    </View>
                  ))}
                </ScrollView>

                <Text style={{ color: '#000', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                  You will not be able to see these codes again. Store them in a secure place.
                </Text>

                <TouchableOpacity onPress={handleDone} style={styles.primaryButton}>
                  <AppText style={styles.primaryButtonText}>Done</AppText>
                </TouchableOpacity>

                {renderDisableSection()}
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
          {renderHeader()}

          <View style={styles.glassWrapper}>
            <View style={styles.glassContent}>
              <Text style={styles.mainTitle}>Enable Two-Factor Auth</Text>
              <Text style={styles.mainSubtitle}>
                Scan the QR code below with Google Authenticator, iOS Passwords,
                or another authenticator app.
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
                <View style={{
                  marginBottom: 12, padding: 10, borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}>
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

              {renderDisableSection()}
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