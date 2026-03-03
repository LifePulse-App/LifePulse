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
} from 'react-native';
import { DefaultTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { getMessaging, getToken, onMessage, onTokenRefresh } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { user } from './src/screens/user/models/UserLoginResponse';
import UserStorage from './src/auth/user/UserStorage';
import apiClient, { setSecretKey } from './src/auth/api-client/api_client';
import { navigationRef } from './src/navigation/main/RootNavigation';

import {
  loadChatNotificationState,
  notifyIncoming,
  getActiveChatPeer,
  markMessagesSeenLocally,
  markMessagesDeliveredLocally,
} from './src/screens/chat/services/ChatNotifications';

import { markDelivered, markAllPendingDelivered } from './src/screens/chat/services/api_chat';

import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

const CHAT_CHANNEL_ID = 'default';

notifee.createChannel({
  id: CHAT_CHANNEL_ID,
  name: 'Default Channel',
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
  console.log(data);

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
      groupId, // ✅ group by sender
      pressAction: { id: 'default' },
    },
    data: {
      type: 'chat',
      peerUserId: peerId,
      peerName,
    },
  });

  await notifee.displayNotification({
    id: summaryId,
    title: peerName,
    body: 'New messages',
    android: {
      channelId: CHAT_CHANNEL_ID,
      groupId, // ✅ same sender group
      groupSummary: true,
      pressAction: { id: 'default' },
    },
    data: {
      type: 'chat_summary',
      peerUserId: peerId,
      peerName,
    },
  });
}

// ✅ keep background handler light (no markAllPendingDelivered loop here)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage?.data || {};
  const notifTitle = remoteMessage?.notification?.title;
  const notifBody = remoteMessage?.notification?.body;

  if (data.type === 'chat') {
    const incomingMessageId = String(data.messageId || data.msgId || data._id || '');
    if (incomingMessageId) {
      try {
        await markDelivered([incomingMessageId]);
      } catch (e) {
        console.log('markDelivered (background) failed', e);
      }
    }

    // ✅ avoid duplicate when FCM already shows system notification
    // still grouped by sender when data-only
    if (!remoteMessage?.notification) {
      await displayChatNotificationGroupedBySender(data, {
        title: notifTitle,
        body: notifBody,
      });
    }
  }

  if (data.type === 'seen') {
    markMessagesSeenLocally(data.peerUserId);
  }

  if (data.type === 'delivered') {
    const ids = parseMessageIds(data.messageIds);
    markMessagesDeliveredLocally(data.peerUserId, ids);
  }
});

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
}

const App = () => {
  const [User, setUser] = useState<user | undefined>();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : DefaultTheme;

  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);

  const secretKeySetRef = useRef(false);
  const lastRegisteredTokenRef = useRef<string | null>(null);

  // ✅ anti-spam guard for markAllPendingDelivered
  const deliveringAllRef = useRef(false);
  const lastDeliverAllAtRef = useRef(0);

  const runMarkAllPendingDelivered = async (reason: string) => {
    const now = Date.now();
    if (now - lastDeliverAllAtRef.current < 15000) return; // 15s throttle
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

  // ✅ only run on app active
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        await runMarkAllPendingDelivered('active');
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log({ type, detail });

      if (
        type === EventType.PRESS &&
        detail?.notification?.data?.type === 'chat' &&
        detail?.notification?.data?.peerUserId
      ) {
        navigationRef.current?.navigate('chat', {
          peerUserId: detail.notification.data.peerUserId,
          peerName: detail.notification.data.peerName,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function checkInitialNotification() {
      const initial = await notifee.getInitialNotification();
      console.log(initial);

      if (
        initial?.notification?.data?.type === 'chat' &&
        initial?.notification?.data?.peerUserId
      ) {
        setTimeout(() => {
          navigationRef.current?.navigate('chat', {
            peerUserId: initial.notification.data.peerUserId,
            peerName: initial.notification.data.peerName,
          });
        }, 600);
      }
    }
    checkInitialNotification();
  }, []);

  useEffect(() => {
    if (!secretKeySetRef.current) {
      setSecretKey();
      secretKeySetRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const run = async () => {
      await notifee.requestPermission();
      const messagingInstance = getMessaging(getApp());

      return onMessage(messagingInstance, async remoteMessage => {
        const data = remoteMessage?.data || {};

        if (data.type === 'chat' && data.peerUserId) {
          const incomingMessageId = String(data.messageId || data.msgId || data._id || '');
          if (incomingMessageId) {
            try {
              await markDelivered([incomingMessageId]);
            } catch (e) {
              console.log('markDelivered (foreground) failed', e);
            }
          }

          const activePeer = getActiveChatPeer();
          if (!activePeer || activePeer !== data.peerUserId) {
            notifyIncoming(data.peerUserId);

            // ✅ foreground: show grouped local notification
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

        // ❌ removed continuous markAllPendingDelivered from every push
      });
    };

    let unsubscribe: undefined | (() => void);
    run().then(unsub => (unsubscribe = unsub));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!User) return;

    let unsubscribeTokenRefresh: undefined | (() => void);

    const register = async (token: string) => {
      if (lastRegisteredTokenRef.current === token) return;
      await apiClient.post('/push/register', { token, platform: 'android' });
      lastRegisteredTokenRef.current = token;
      console.log('[FCM] Registered token:', token);
    };

    const run = async () => {
      const messagingInstance = getMessaging(getApp());
      const token = await getToken(messagingInstance);
      await register(token);

      unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async newToken => {
        await register(newToken);
      });
    };

    run();

    return () => {
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [User]);

  // ✅ once after user ready
  useEffect(() => {
    if (!User) return;
    runMarkAllPendingDelivered('user-ready');
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
            await UserStorage.deleteUser();
            await UserStorage.clearTokens?.();
            navigationRef.current?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
            );
          }
        } else {
          setIsBiometricVerified(true);
        }
      } catch (e) {
        console.log('Biometric check failed:', e);
        setIsBiometricVerified(false);
        await UserStorage.deleteUser();
        await UserStorage.clearTokens?.();
        navigationRef.current?.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          }),
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
        style={{
          borderLeftColor: 'green',
          backgroundColor: '#e6ffed',
          width: '100%',
          alignSelf: 'center',
        }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        text1Style={{ fontSize: 13, fontWeight: '600', color: 'green' }}
      />
    ),
    error: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: 'red',
          backgroundColor: '#ffeaea',
          width: '100%',
          alignSelf: 'center',
        }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        text1Style={{ fontSize: 13, fontWeight: '600', color: 'red' }}
      />
    ),
  };

  if (isCheckingBiometric) {
    return (
      <PaperProvider
        theme={theme}
        settings={{
          icon: ({ name, size, color }) => (
            <MaterialCommunityIcons name={name as string} size={size} color={color} />
          ),
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#020617',
          }}
        >
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: ({ name, size, color }) => (
          <MaterialCommunityIcons name={name as string} size={size} color={color} />
        ),
      }}
    >
      <AuthContext.Provider value={{ User, setUser }}>
        {isBiometricVerified ? (
          <NavigationContainer theme={NavigationTheme} ref={navigationRef}>
            <AuthNavigator />
          </NavigationContainer>
        ) : null}
        <Toast config={toastConfig} position="top" topOffset={5} />
      </AuthContext.Provider>
    </PaperProvider>
  );
};

export default App;