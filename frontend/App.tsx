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
  DeviceEventEmitter, // ⚡ Added to dispatch wake up events
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

// ⚡ CLEANED: Only asks for POST_NOTIFICATIONS on launch
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

  const secretKeySetRef = useRef(false);
  const lastRegisteredTokenRef = useRef<string | null>(null);
  const deliveringAllRef = useRef(false);
  const lastDeliverAllAtRef = useRef(0);

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

  // ⚡ FIX: Emits Wake Up for calls, only navigates for chats
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

  // ⚡ FIX: Boot-up lock screen interceptor
 useEffect(() => {
    async function checkInitialNotification() {
      const initial = await notifee.getInitialNotification();
      if (initial?.notification?.data) {
        const data = initial.notification.data;

        setTimeout(() => {
          // ⚡ FIX: Removed incoming_call logic entirely. 
          // Only handle chats here. CallProvider handles calls automatically!
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

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemNavigationBar.navigationHide();
      SystemNavigationBar.stickyImmersive();
    }
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
        const data = remoteMessage?.data || {};

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
    if (!User) return;
    if (Platform.OS !== 'android') return;

    let unsubscribeTokenRefresh: undefined | (() => void);

    const register = async (token: string) => {
      if (!token) return;
      if (lastRegisteredTokenRef.current === token) return;
      await apiClient.post('/push/register', { token, platform: Platform.OS });
      lastRegisteredTokenRef.current = token;
      console.log('[FCM] Registered token:', token);
    };

    const run = async () => {
      const firebaseApp = getApp();
      const messagingInstance = getMessaging(firebaseApp);
      const token = await getToken(messagingInstance);
      await register(token);

      unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async newToken => {
        await register(newToken);
      });
    };

    run().catch(e => console.log('[FCM] token setup failed', e));
    return () => { if (unsubscribeTokenRefresh) unsubscribeTokenRefresh(); };
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

  useEffect(() => {
    if (User) {
      connectSocket().catch(e => console.log('Socket boot error:', e));
    } else {
      disconnectSocket();
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

  if (isCheckingBiometric) {
    return (
      <PaperProvider settings={{ icon: ({ name, size, color }) => <MaterialCommunityIcons name={name as string} size={size} color={color} /> }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </PaperProvider>
    );
  }

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
          <Toast config={toastConfig} position="top" topOffset={30} />
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