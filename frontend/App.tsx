import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import {
  useColorScheme,
  View,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import codePush from "@revopush/react-native-code-push";
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken, onMessage, onTokenRefresh } from '@react-native-firebase/messaging';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { user } from './src/screens/user/models/UserLoginResponse';
import UserStorage from './src/auth/user/UserStorage';
import apiClient, { setSecretKey } from './src/auth/api-client/api_client';
import { navigationRef, resetToLogin } from './src/navigation/main/RootNavigation';
import AppUpdateGate from './AppUpdateGate';
import { enableScreens } from 'react-native-screens';
import { AnimatedSplash } from './AnimatedSplash';
import {
  loadChatNotificationState,
  notifyIncoming,
  getActiveChatPeer,
  markMessagesSeenLocally,
  markMessagesDeliveredLocally,
} from './src/screens/chat/services/ChatNotifications';

import { markDelivered, markAllPendingDelivered } from './src/screens/chat/services/api_chat';
import { notificationNavState } from './index'; 
import { handleNotificationPress } from './handleNotificationPress'; 

import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider } from 'react-native-paper';
import { connectSocket, disconnectSocket, getSocket } from './src/auth/api-client/socket';

// ⚡ REVENUECAT: Import the SDK
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// ⚡ REVENUECAT: API Keys from Dashboard
const REVENUECAT_API_KEYS = {
  apple: "test_ABGyHRcQgTRDEYqDUCexpisaSbC",
  google: "test_ABGyHRcQgTRDEYqDUCexpisaSbC",
};

// Guard flag to prevent duplicate configurations across re-renders
let isRevenueCatConfigured = false;

const CHAT_CHANNEL_ID = 'default';

notifee.createChannel({
  id: CHAT_CHANNEL_ID,
  name: 'Default Channel',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

const APP_CHANNEL_ID = 'app_notifications';

notifee.createChannel({
  id: APP_CHANNEL_ID,
  name: 'App Notifications',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

function parseMessageIds(raw: any): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function displayChatNotificationGroupedBySender(
  data: any,
  fallback?: { title?: string; body?: string }
) {
  const peerId = String(data.peerUserId || 'unknown');
  const peerName = data.username || data.peerName || fallback?.title || 'Someone';
  const messageId = data.messageId || data.msgId || data._id || Date.now();
  const body = data.body || data.message || fallback?.body || 'Sent you a message';
  const groupId = `chat:${peerId}`;
  const summaryId = `chat-summary:${peerId}`;

  await notifee.displayNotification({
    id: `chat:${peerId}:msg:${messageId}`,
    title: peerName,
    body,
    android: {
      channelId: CHAT_CHANNEL_ID,
      groupId,
      groupSummary: true,
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: ['alert', 'sound', 'badge'],
    },
    data: { type: 'chat', peerUserId: peerId, peerName },
  });

  await notifee.displayNotification({
    id: summaryId,
    title: peerName,
    body: 'New messages',
    android: {
      channelId: CHAT_CHANNEL_ID,
      groupId,
      groupSummary: true,
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: ['alert', 'sound', 'badge'],
    },
    data: { type: 'chat_summary', peerUserId: peerId, peerName },
  });
}

async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  } else if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  }
}

async function unregisterPushToken() {
  try {
    const firebaseApp = getApp();
    const messagingInstance = getMessaging(firebaseApp);
    const token = await getToken(messagingInstance);
    if (token) {
      await apiClient.post('/push/unregister', { token, platform: Platform.OS });
      console.log('[FCM] Unregistered token:', token);
    }
  } catch (e) {
    console.log('Failed to unregister push token:', e);
  }
}

const App = () => {
  const [User, setUser] = useState<user | undefined>();
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  
  const secretKeySetRef = useRef(false);
  const lastRegisteredTokenRef = useRef<string | null>(null);
  const deliveringAllRef = useRef(false);
  const lastDeliverAllAtRef = useRef(0);

  // ⚡ REVENUECAT: Safe One-Time Initialization
  useEffect(() => {
    if (!isRevenueCatConfigured) {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEYS.apple });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEYS.google });
      }
      isRevenueCatConfigured = true;
    }
  }, []);

  const runMarkAllPendingDelivered = async (reason: string) => {
    const now = Date.now();
    if (now - lastDeliverAllAtRef.current < 15000) return;
    if (deliveringAllRef.current) return;
    deliveringAllRef.current = true;
    lastDeliverAllAtRef.current = now;
    try {
      await markAllPendingDelivered();
    } catch (e) {
      console.log(`markAllPendingDelivered (${reason}) failed`, e);
    } finally {
      deliveringAllRef.current = false;
    }
  };

  useEffect(() => {
    loadChatNotificationState();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        await runMarkAllPendingDelivered('active');
        
        try {
          const displayed = await notifee.getDisplayedNotifications();
          const chatNotifs = displayed
            .filter(n => 
              n.notification?.data?.type === 'chat' ||
              n.notification?.data?.type === 'chat_summary'
            )
            .map(n => n.id);
          
          await Promise.all(chatNotifs.map(id => notifee.cancelNotification(id)));
        } catch (e) {
          console.log('Failed to cancel chat notifications:', e);
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS && detail?.notification?.data) {
        const data = detail.notification.data;
        if (data.type === 'chat' && data.peerUserId) {
          navigationRef.current?.navigate('chat', {
            peerUserId: data.peerUserId,
            peerName: data.peerName,
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function checkInitialNotification() {
      const initial = await notifee.getInitialNotification();
      if (initial?.notification?.data) {
        const data = initial.notification.data;
        setTimeout(() => {
          if (data.type === 'chat' && data.peerUserId) {
            navigationRef.current?.navigate('chat', {
              peerUserId: data.peerUserId,
              peerName: data.peerName,
            });
          }
        }, 600);
      }
    }
    checkInitialNotification();
  }, []);

  enableScreens(true);

  useEffect(() => {
    if (!secretKeySetRef.current) {
      setSecretKey();
      secretKeySetRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    let unsubscribe: undefined | (() => void);

    const run = async () => {
      const firebaseApp = getApp();
      const messagingInstance = getMessaging(firebaseApp);

      return onMessage(messagingInstance, async remoteMessage => {
        console.log('📱 [FCM RAW FOREGROUND MESSAGE ARRIVED]:', JSON.stringify(remoteMessage));
        const data = remoteMessage?.data || {};

        if (data.type === 'general' || data.type === 'admin_broadcast' || data.type === 'admin_direct' || data.title) {
          try {
            await notifee.displayNotification({
              id: `${data.type || 'broadcast'}:${Date.now()}`,
              title: String(data.title || 'StreakSphere'),
              body: String(data.body || ''),
              android: {
                channelId: 'app_notifications',
                pressAction: { id: 'default' },
                sound: 'default',
                importance: AndroidImportance.HIGH,
              },
              ios: {
                sound: 'default',
                foregroundPresentationOptions: ['alert', 'sound', 'badge'],
              },
              data: { ...data },
            });
          } catch (notifeeErr) {
            console.log('❌ [Foreground Notification] Notifee error:', notifeeErr);
          }
          return; 
        }

        if (data.type === 'chat' && data.peerUserId) {
          const incomingMessageId = String(data.messageId || data.msgId || data._id || '');
          if (incomingMessageId) {
            try {
              const socket = getSocket();
              if (socket?.connected && data.conversationId) {
                socket.emit("mark-delivered", {
                  messageIds: [incomingMessageId],
                  myUserId: User?.id || User?._id,
                  conversationId: data.conversationId
                });
              } else {
                await markDelivered([incomingMessageId]);
              }
            } catch (e) {
              console.log('markDelivered (foreground) failed', e);
            }
          }
          const activePeer = getActiveChatPeer();
          if (!activePeer || activePeer !== data.peerUserId) {
            notifyIncoming(data.peerUserId);
            await displayChatNotificationGroupedBySender(data, {
              title: remoteMessage?.notification?.title,
              body: remoteMessage?.notification?.body,
            });
          }
        }

        if (data.type === 'seen' && data.peerUserId) {
          markMessagesSeenLocally(data.peerUserId);
        }

        if (data.type === 'delivered' && data.peerUserId) {
          const ids = parseMessageIds(data.messageIds);
          markMessagesDeliveredLocally(data.peerUserId, ids);
        }
      });
    };

    run().then(unsub => (unsubscribe = unsub));
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    let unsubscribeTokenRefresh: undefined | (() => void);

    const registerTokenToServer = async (token: string) => {
      if (!token) return;
      if (lastRegisteredTokenRef.current === token) return;
      try {
        await apiClient.post('/push/register', { token, platform: Platform.OS });
        lastRegisteredTokenRef.current = token;
      } catch (e) {
        console.log('[FCM] Failed to post token to backend:', e);
      }
    };

    const setupFCM = async () => {
      try {
        const firebaseApp = getApp();
        const messagingInstance = getMessaging(firebaseApp);
        
        const token = await getToken(messagingInstance);
        if (token) {
          await registerTokenToServer(token);
        }

        unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async newToken => {
          await registerTokenToServer(newToken);
        });
      } catch (e) {
        console.log('[FCM] token setup failed:', e);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [User]); 

  useEffect(() => {
    if (!User) return;
    runMarkAllPendingDelivered('user-ready');
  }, [User]);

  useEffect(() => {
    if (notificationNavState.pending) {
      setTimeout(() => {
        handleNotificationPress(notificationNavState.pending);
        notificationNavState.pending = null; 
      }, 600);
    }
  }, [isBiometricVerified]);

  // ⚡ REVENUECAT: Strict User Identity Management & Safe Logout
  useEffect(() => {
    if (User) {
      connectSocket().catch(e => console.log('Socket boot error:', e));
      
      const userId = String(User?.user.id || User._id || '');
      
      if (userId && userId !== 'undefined') {
        Purchases.logIn(userId).then(async () => {
          try {
            await Purchases.invalidateCustomerInfoCache();
            await Purchases.getCustomerInfo();
          } catch (e) {
            console.log('RevenueCat Sync Error:', e);
          }
        }).catch(e => console.log('RevenueCat Login Error:', e));
      }
    } else {
      disconnectSocket();
      
      // ✅ SAFE LOGOUT: Only log out if currently identified as a non-anonymous user
      Purchases.getAppUserID().then((appUserId) => {
        if (appUserId && !appUserId.startsWith('$RCAnonymousID:')) {
          Purchases.logOut().then(() => {
            Purchases.invalidateCustomerInfoCache();
          }).catch(e => console.log('RevenueCat Logout Error:', e));
        }
      }).catch(() => {});
    }
  }, [User]);

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
        const savedUser = await UserStorage.getUser();

        if (biometricEnabled === 'true' && savedUser) {
          const rnBiometrics = new ReactNativeBiometrics();
          const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Unlock with Face ID / Fingerprint',
          });

          if (success) {
            setIsBiometricVerified(true);
          } else {
            setIsBiometricVerified(false);
            await unregisterPushToken();
            await UserStorage.deleteUser();
            await UserStorage.clearTokens?.();
            resetToLogin();
          }
        } else {
          setIsBiometricVerified(true);
        }
      } catch (e) {
        console.log('Biometric check failed:', e);
        setIsBiometricVerified(false);
        await unregisterPushToken();
        await UserStorage.deleteUser();
        await UserStorage.clearTokens?.();
        navigationRef.current?.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
        );
      } finally {
        setIsCheckingBiometric(false);
      }
    };

    checkBiometric();
  }, []);

  const toastConfig = {
    success: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: 'green', backgroundColor: '#e6ffed', width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        text1Style={{ fontSize: 13, fontWeight: '600', color: 'green' }}
      />
    ),
    error: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: 'red', backgroundColor: '#ffeaea', width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        text1Style={{ fontSize: 13, fontWeight: '600', color: 'red' }}
      />
    ),
  };

  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider settings={{ icon: ({ name, size, color }) => <MaterialCommunityIcons name={name as string} size={size} color={color} /> }}>
          <AuthContext.Provider value={{ User, setUser }}>
            <AppUpdateGate>
              {isBiometricVerified ? (
                <NavigationContainer ref={navigationRef}>
                  <AuthNavigator />
                </NavigationContainer>
              ) : null}
            </AppUpdateGate>
          </AuthContext.Provider>
        </PaperProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
};

const codePushOptions = { 
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
  mandatoryInstallMode: codePush.InstallMode.ON_NEXT_RESTART,
};

export default codePush(codePushOptions)(App);