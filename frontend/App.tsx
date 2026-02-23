import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, Platform } from 'react-native';
import { DefaultTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';

import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { user } from './src/screens/user/models/UserLoginResponse';
import UserStorage from './src/auth/user/UserStorage';
import apiClient, { setSecretKey } from './src/auth/api-client/api_client';
import { navigationRef } from './src/navigation/main/RootNavigation';

import { loadChatNotificationState, notifyIncoming, getActiveChatPeer, markMessagesSeenLocally } from './src/screens/chat/services/ChatNotifications';

import { PermissionsAndroid } from 'react-native';

import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// ---- BACKGROUND HANDLER (must be at module/root level!) ----
import messaging from '@react-native-firebase/messaging';

/**
 * ---------------------------
 * Channel (sound + vibration)
 * ---------------------------
 * NOTE: channels are sticky on Android. If "default" was silent before,
 * you may need uninstall/reinstall OR change channel id.
 */
const CHAT_CHANNEL_ID = 'default';

notifee.createChannel({
  id: CHAT_CHANNEL_ID,
  name: 'Default Channel',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

/**
 * ✅ Group notifications by SENDER (peerUserId)
 * - All messages from same sender stack together.
 * - Different senders create separate groups (still under your app).
 */
async function displayChatNotificationGroupedBySender(data: any) {
  const peerId = String(data.peerUserId || 'unknown');
  const peerName = data.username || 'Someone';

  const messageId = data.messageId || data.msgId || data._id || Date.now();
  const body = data.body || data.text || 'Sent you a message';

  // Group per sender
  const groupId = `chat:${peerId}`;
  const summaryId = `chat-summary:${peerId}`;

  // 1) Actual message notification
  await notifee.displayNotification({
    id: `chat:${peerId}:msg:${messageId}`,
    title: peerName,
    body,
    android: {
      channelId: CHAT_CHANNEL_ID,
      groupId,
      pressAction: { id: 'default' },
    },
    data: {
      type: 'chat',
      peerUserId: peerId,
    },
  });

  // 2) Summary notification (required for reliable grouping)
  await notifee.displayNotification({
    id: summaryId,
    title: peerName,
    body: 'New messages',
    android: {
      channelId: CHAT_CHANNEL_ID,
      groupId,
      groupSummary: true,
      pressAction: { id: 'default' },
    },
    data: {
      type: 'chat_summary',
      peerUserId: peerId,
    },
  });
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage?.data || {};

  if (data.type === 'chat') {
    await displayChatNotificationGroupedBySender(data);
  }

  if (data.type === 'seen') {
    markMessagesSeenLocally(data.peerUserId);
  }
});

// Android 13+ notification runtime permission
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

  // Prevent duplicate /push/register calls for the same token
  const lastRegisteredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    loadChatNotificationState();
    requestNotificationPermission();
  }, []);

  // ---------- Notifee notification press handler ----------
  useEffect(() => {
    // Foreground/background (app is running)
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
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
    // Cold start launch by notification
    async function checkInitialNotification() {
      const initial = await notifee.getInitialNotification();
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

  // ---------- Setup secret key once ----------
  useEffect(() => {
    if (!secretKeySetRef.current) {
      setSecretKey();
      secretKeySetRef.current = true;
    }
  }, []);

  // ---------- Foreground notifications handler ----------
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const run = async () => {
      await notifee.requestPermission();
      const messagingInstance = getMessaging(getApp());

      // Foreground message handler
      return onMessage(messagingInstance, async remoteMessage => {
        const data = remoteMessage?.data || {};
        if (data.type === 'chat' && data.peerUserId) {
          const activePeer = getActiveChatPeer();
          if (!activePeer || activePeer !== data.peerUserId) {
            notifyIncoming(data.peerUserId);
            await displayChatNotificationGroupedBySender(data);
          }
        }
        if (data.type === 'seen' && data.peerUserId) {
          markMessagesSeenLocally(data.peerUserId);
        }
      });
    };

    let unsubscribe: undefined | (() => void);
    run().then(unsub => (unsubscribe = unsub));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------- Register token AFTER user is available + token refresh ----------
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

  // ---------- Biometric gate ----------
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