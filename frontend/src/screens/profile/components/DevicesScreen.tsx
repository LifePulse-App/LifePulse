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
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const renderHeader = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
              {devices.length === 0 ? (
                <Text style={{ color: '#000', textAlign: 'center' }}>
                  No devices found.
                </Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {devices.map((d, idx) => {
                    const isCurrent = d.deviceId === currentDeviceId;
                    const locText =
                      d.location?.city || d.location?.country
                        ? `${d.location?.city || ''}${
                            d.location?.city && d.location?.country ? ', ' : ''
                          }${d.location?.country || ''}`
                        : 'Unknown location';

                    return (
                      <View
                        key={d.deviceId || idx}
                        style={{
                          marginBottom: 10,
                          padding: 12,
                          borderRadius: 14,
                          backgroundColor: isCurrent
                            ? 'rgba(59,130,246,0.12)'
                            : 'rgba(15,23,42,0.08)',
                          borderWidth: 1,
                          borderColor: isCurrent
                            ? 'rgba(59,130,246,0.8)'
                            : 'rgba(148,163,184,0.5)',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon
                            name={isCurrent ? 'cellphone' : 'tablet-cellphone'}
                            size={28}
                            color={isCurrent ? '#3B82F6' : '#9CA3AF'}
                          />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text
                              style={{
                                color: '#000',
                                fontWeight: '700',
                                fontSize: 15,
                              }}
                            >
                              {d.deviceName || 'Unknown device'}
                              {isCurrent ? ' (This device)' : ''}
                            </Text>
                            <Text style={{ color: '#4B5563', fontSize: 13 }}>
                              {d.deviceBrand || ''} {d.deviceModel || ''}
                            </Text>
                            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                              Last login: {formatDateTime(d.lastLogin)}
                            </Text>
                            <Text style={{ color: '#6B7280', fontSize: 12 }}>
                              Location: {locText}
                            </Text>
                          </View>
                        </View>

                        {!isCurrent && (
                          <TouchableOpacity
                            onPress={() => openLogoutConfirm(d.deviceId)}
                            style={{
                              marginTop: 8,
                              alignSelf: 'flex-end',
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: '#EF4444',
                              backgroundColor: 'rgba(239,68,68,0.08)',
                            }}
                          >
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
              width: 280,
              borderRadius: 18,
              backgroundColor: 'rgba(15,23,42,0.95)',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 20,
            }}
          >
            <Text
              style={{
                color: '#F9FAFB',
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Logout this device?
            </Text>
            <Text
              style={{
                color: '#E5E7EB',
                fontSize: 13,
                marginBottom: 16,
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
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: 'rgba(148,163,184,0.25)',
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
                  paddingVertical: 8,
                  borderRadius: 10,
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