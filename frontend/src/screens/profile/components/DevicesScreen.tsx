import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api_Login from '../../login/services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';
import NetInfo from '@react-native-community/netinfo';

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

const DEVICES_CACHE_KEY = "devicescreen:authorizedDevices:v1";

const DevicesScreen = () => {
  const navigation = useNavigation<any>();

  const [devices, setDevices] = useState<DeviceInfoItem[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [offline, setOffline] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };
  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const loadDevices = useCallback(async () => {
    let hasCachedData = false;
    
    // Fetch the current device ID immediately
    const id = await DeviceInfo.getUniqueId();
    setCurrentDeviceId(id);

    // Helper to always push current device to top, and sort rest by last login
    const sortDevices = (list: DeviceInfoItem[]) => {
      return [...list].sort((a, b) => {
        if (a.deviceId === id) return -1;
        if (b.deviceId === id) return 1;
        const timeA = new Date(a.lastLogin || 0).getTime();
        const timeB = new Date(b.lastLogin || 0).getTime();
        return timeB - timeA; // Newest first
      });
    };

    // 1. Immediately load and show cached data if available
    try {
      const raw = await AsyncStorage.getItem(DEVICES_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && "devices" in parsed && Array.isArray(parsed.devices)) {
          setDevices(sortDevices(parsed.devices));
          hasCachedData = true;
          setLoading(false); // Stop skeleton loader immediately
        }
      }
    } catch {}

    // 2. Check current network status explicitly before making API call
    const netState = await NetInfo.fetch();
    const isOffline = !netState.isConnected || netState.isInternetReachable === false;
    
    if (isOffline) {
      setOffline(true);
      setLoading(false);
      return; // Stick with cached data, don't attempt API call
    } else {
      setOffline(false);
    }

    // 3. If online, fetch fresh data from API
    if (!hasCachedData) setLoading(true);
    
    try {
      const res = await api_Login.getDevices();
      if (!res.ok) {
        if (!hasCachedData) {
          showError((res as any).data?.message || 'Failed to load devices');
        }
        setLoading(false);
        return;
      }

      const data: any = res.data;
      const list: DeviceInfoItem[] = data.devices || [];

      if (data.devices) {
        const sortedList = sortDevices(list);
        setDevices(sortedList);
        
        await AsyncStorage.setItem(
          DEVICES_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), devices: sortedList })
        );
      }
    } catch (e: any) {
      if (!hasCachedData) {
        showError('Unable to fetch devices. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Handle re-connections
  useEffect(() => {
    if (!offline) {
      loadDevices();
    }
  }, [offline, loadDevices]);

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
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Authorized Devices</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderOfflineBanner = () => {
    if (!offline) return null;
    return (
      <View style={styles.offlineBanner}>
        <Icon name="wifi-off" size={14} color="#94A3B8" />
        <Text style={styles.offlineText}>Offline — showing cached data</Text>
      </View>
    );
  };

  const openLogoutConfirm = (deviceId: string) => {
    if (offline) {
      showError("You're offline. Please connect to the internet to logout a device.");
      return;
    }
    setTargetDeviceId(deviceId);
    setConfirmVisible(true);
  };

  const performLogoutDevice = async () => {
    if (!targetDeviceId || offline) return;
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

  // Skeleton Loading State
  if (loading && devices.length === 0) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerTextWrap}>
            <View style={[styles.skeletonLine, { width: '60%', height: 20, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
          </View>
          
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.deviceCard}>
              <View style={styles.deviceRow}>
                <View style={styles.skeletonIcon} />
                <View style={styles.deviceInfoWrap}>
                  <View style={[styles.skeletonLine, { width: '50%', height: 16, marginBottom: 8 }]} />
                  <View style={[styles.skeletonLine, { width: '70%', height: 12, marginBottom: 6 }]} />
                  <View style={[styles.skeletonLine, { width: '60%', height: 12, marginBottom: 6 }]} />
                  <View style={[styles.skeletonLine, { width: '40%', height: 12 }]} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      <View style={styles.root}>
        {renderHeader()}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderOfflineBanner()}

          <View style={styles.headerTextWrap}>
            <Text style={styles.mainTitle}>Your active sessions</Text>
            <Text style={styles.mainSubtitle}>
              These devices are currently logged into your account.
            </Text>
          </View>

          {devices.length === 0 ? (
            <Text style={styles.emptyText}>No devices found.</Text>
          ) : (
            <View style={{ paddingBottom: 40 }}>
              {devices.map((d, idx) => {
                const isCurrent = d.deviceId === currentDeviceId;
                const locText = formatLocation(d);

                return (
                  <View
                    key={d.deviceId || idx}
                    style={[
                      styles.deviceCard,
                      isCurrent && styles.currentDeviceCard
                    ]}
                  >
                    <View style={styles.deviceRow}>
                      <View style={[styles.iconWrap, isCurrent && styles.currentIconWrap]}>
                        <Icon
                          name={isCurrent ? 'cellphone' : 'tablet-cellphone'}
                          size={24}
                          color={isCurrent ? '#818CF8' : '#94A3B8'}
                        />
                      </View>
                      
                      <View style={styles.deviceInfoWrap}>
                        <View style={styles.deviceTitleRow}>
                          <Text style={styles.deviceName} numberOfLines={1}>
                            {d.deviceName || 'Unknown device'}
                          </Text>
                          {isCurrent && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>THIS DEVICE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.deviceSub}>
                          {d.deviceBrand || ''} {d.deviceModel || ''}
                        </Text>
                        <Text style={styles.deviceDetail}>
                          Last login: {formatDateTime(d.lastLogin)}
                        </Text>
                        <Text style={styles.deviceDetail}>
                          Location: {locText}
                        </Text>
                      </View>
                    </View>

                    {!isCurrent && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => openLogoutConfirm(d.deviceId)}
                          style={[styles.logoutBtn, offline && styles.disabledLogoutBtn]}
                          disabled={offline}
                          activeOpacity={offline ? 1 : 0.8}
                        >
                          <Icon 
                            name="logout-variant" 
                            size={14} 
                            color={offline ? "#64748B" : "#F87171"} 
                            style={{ marginRight: 6 }} 
                          />
                          <Text style={[styles.logoutBtnText, offline && styles.disabledLogoutBtnText]}>
                            Logout device
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modern Dark Confirmation Modal */}
      {confirmVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout this device?</Text>
            <Text style={styles.modalText}>
              This will sign out that device from your account. It will need to log in again to regain access.
            </Text>
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => { setConfirmVisible(false); setTargetDeviceId(null); }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={performLogoutDevice}
                disabled={logoutLoading}
                style={styles.modalConfirmBtn}
              >
                {logoutLoading ? (
                  <LoaderKitView
                    style={{ width: 20, height: 20 }}
                    name={'BallSpinFadeLoader'}
                    color={'#FFFFFF'}
                  />
                ) : (
                  <Text style={styles.modalConfirmText}>Logout</Text>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617', // Flat, deep dark background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 60 : 50,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTextWrap: {
    marginBottom: 20,
    marginTop: 10,
  },
  mainTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  mainSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  
  // Device Card Styles
  deviceCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  currentDeviceCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIconWrap: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  deviceInfoWrap: {
    flex: 1,
    marginLeft: 14,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    color: '#F9FAFB',
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  deviceSub: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  deviceDetail: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledLogoutBtn: {
    backgroundColor: 'rgba(71, 85, 105, 0.15)',
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  disabledLogoutBtnText: {
    color: '#64748B',
  },

  // Skeleton Styles
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonLine: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.8)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default DevicesScreen;