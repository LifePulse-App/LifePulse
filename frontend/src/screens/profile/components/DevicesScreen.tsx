import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';

import { loginStyles } from '../../login/components/Loginstyles';
import api_Login from '../../login/services/api_Login';
import AppText from '../../../components/Layout/AppText/AppText';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

type DeviceInfoItem = {
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  deviceBrand?: string;
  lastLogin?: string | Date;
  location?: {
    city?: string;
    country?: string;
    ip?: string;
  };
};

const DevicesScreen = () => {
  const styles = loginStyles();
  const navigation = useNavigation<any>();

  const [devices, setDevices] = useState<DeviceInfoItem[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };
  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  const loadDevices = async () => {
    try {
      const id = await DeviceInfo.getUniqueId();
      setCurrentDeviceId(id);

      const res = await api_Login.getDevices();
      if (!res.ok) {
        showError((res as any).data?.message || 'Failed to load devices');
        setLoading(false);
        return;
      }

      const data: any = res.data;
      setDevices(data.devices || []);
    } catch (e: any) {
      showError('Unable to fetch devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const formatDateTime = (value?: string | Date) => {
    if (!value) return 'Unknown';
    const date = value instanceof Date ? value : new Date(value);
    return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const formatLocation = (d: DeviceInfoItem) => {
    if (d.location?.city || d.location?.country) {
      const city = d.location.city || '';
      const country = d.location.country || '';
      return `${city}${city && country ? ', ' : ''}${country}`;
    }
    return 'Unknown location';
  };

  const renderHeader = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        marginTop: 30,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 16,
          backgroundColor: 'rgba(15,23,42,0.0)',
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 4,
        }}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '700',
          color: '#F9FAFB',
          marginRight: 40,
        }}
      >
        Authorized Devices
      </Text>
    </View>
  );

  const openLogoutConfirm = (deviceId: string) => {
    setTargetDeviceId(deviceId);
    setConfirmVisible(true);
  };

  const performLogoutDevice = async () => {
    if (!targetDeviceId) return;
    setLogoutLoading(true);
    try {
      const res = await api_Login.logoutDevice(targetDeviceId);
      if (!res.ok) {
        showError((res as any).data?.message || 'Failed to logout device');
      } else {
        await loadDevices();
      }
    } catch {
      showError('Failed to logout device. Please try again.');
    } finally {
      setLogoutLoading(false);
      setConfirmVisible(false);
      setTargetDeviceId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <LoaderKitView
          style={{ width: 40, height: 40 }}
          name={'BallSpinFadeLoader'}
          animationSpeedMultiplier={1.0}
          color={'#FFFFFF'}
        />
        <AppText style={{ marginTop: 12, color: '#FFFFFF' }}>
          Loading devices...
        </AppText>
      </View>
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
              {/* Section title / subtitle inside card */}
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    color: '#020617',
                    fontSize: 18,
                    fontWeight: '700',
                    marginBottom: 4,
                  }}
                >
                  Your active sessions
                </Text>
                <Text
                  style={{
                    color: 'white',
                    fontSize: 13,
                  }}
                >
                  These devices are currently logged into your account.
                </Text>
              </View>

              {devices.length === 0 ? (
                <Text style={{ color: '#000', textAlign: 'center', marginTop: 18 }}>
                  No devices found.
                </Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 420, marginTop: 10 }}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {devices.map((d, idx) => {
                    const isCurrent = d.deviceId === currentDeviceId;
                    const locText = formatLocation(d);

                    return (
                      <View
                        key={d.deviceId || idx}
                        style={{
                          marginBottom: 10,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 16,
                          backgroundColor: isCurrent
                            ? 'rgba(191,219,254,0.8)'
                            : 'rgba(248,250,252,0.9)',
                          borderWidth: 1,
                          borderColor: isCurrent
                            ? 'rgba(37,99,235,0.9)'
                            : 'rgba(148,163,184,0.6)',
                          shadowColor: '#000',
                          shadowOpacity: 0.08,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 4 },
                          elevation: 2,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Icon
                            name={isCurrent ? 'cellphone' : 'tablet-cellphone'}
                            size={26}
                            color={isCurrent ? '#1D4ED8' : '#64748B'}
                          />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 2,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#020617',
                                  fontWeight: '700',
                                  fontSize: 15,
                                  flexShrink: 1,
                                }}
                              >
                                {d.deviceName || 'Unknown device'}
                              </Text>
                              {isCurrent && (
                                <View
                                  style={{
                                    marginLeft: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 999,
                                    backgroundColor: '#1D4ED8',
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: '#F9FAFB',
                                      fontSize: 10,
                                      fontWeight: '700',
                                    }}
                                  >
                                    THIS DEVICE
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={{
                                color: '#4B5563',
                                fontSize: 13,
                                marginBottom: 2,
                              }}
                            >
                              {d.deviceBrand || ''} {d.deviceModel || ''}
                            </Text>
                            <Text
                              style={{
                                color: '#6B7280',
                                fontSize: 12,
                              }}
                            >
                              Last login: {formatDateTime(d.lastLogin)}
                            </Text>
                            <Text
                              style={{
                                color: '#6B7280',
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              Location: {locText}
                            </Text>
                          </View>
                        </View>

                        {/* Logout button for non-current devices */}
                        {!isCurrent && (
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'flex-end',
                              marginTop: 4,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => openLogoutConfirm(d.deviceId)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: '#EF4444',
                                backgroundColor: 'rgba(248,113,113,0.08)',
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <Icon
                                name="logout-variant"
                                size={14}
                                color="#EF4444"
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={{
                                  color: '#EF4444',
                                  fontSize: 12,
                                  fontWeight: '600',
                                }}
                              >
                                Logout this device
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {confirmVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(15,23,42,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 290,
              borderRadius: 20,
              backgroundColor: 'rgba(15,23,42,0.97)',
              borderWidth: 1,
              borderColor: 'rgba(148,163,184,0.6)',
              padding: 22,
            }}
          >
            <Text
              style={{
                color: '#F9FAFB',
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Logout this device?
            </Text>
            <Text
              style={{
                color: '#E5E7EB',
                fontSize: 13,
                marginBottom: 18,
                textAlign: 'center',
              }}
            >
              This will sign out that device from your account. It will need to
              log in again to regain access.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setConfirmVisible(false);
                  setTargetDeviceId(null);
                }}
                style={{
                  flex: 1,
                  marginRight: 6,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: 'rgba(148,163,184,0.28)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#E5E7EB', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={performLogoutDevice}
                disabled={logoutLoading}
                style={{
                  flex: 1,
                  marginLeft: 6,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                }}
              >
                {logoutLoading ? (
                  <LoaderKitView
                    style={{ width: 20, height: 20 }}
                    name={'BallSpinFadeLoader'}
                    animationSpeedMultiplier={1.0}
                    color={'#FFFFFF'}
                  />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage || ''}
        onClose={hideError}
      />
    </>
  );
};

export default DevicesScreen;