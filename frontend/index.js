import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { Crypto } from '@peculiar/webcrypto';

// Polyfills
if (!global.Buffer) global.Buffer = Buffer;
if (!global.crypto) global.crypto = new Crypto();
else if (!global.crypto.subtle) global.crypto.subtle = new Crypto().subtle;

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';

import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import App from './App';
import { name as appName } from './app.json';

import {
  markMessagesSeenLocally,
  markMessagesDeliveredLocally,
} from './src/screens/chat/services/ChatNotifications';

import { markDelivered } from './src/screens/chat/services/api_chat';
import { navigationRef } from './src/navigation/main/RootNavigation';
import { setSecretKey } from './src/auth/api-client/api_client';
import UserStorage from './src/auth/user/UserStorage';
import apiClient from './src/auth/api-client/api_client';

/*
|--------------------------------------------------------------------------
| Notification Channels
|--------------------------------------------------------------------------
*/

// Chat channel (existing)
notifee.createChannel({
  id: 'default',
  name: 'Chat Notifications',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

// App notifications channel (new)
notifee.createChannel({
  id: 'app_notifications',
  name: 'App Notifications',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function parseMessageIds(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
  } catch {
    return [];
  }
}

function getNotifColor(type) {
  if (!type) return '#6366f1';
  if (type.includes('streak')) return '#f97316';
  if (type.includes('leaderboard') || type.includes('rank')) return '#818cf8';
  if (type.includes('friend')) return '#34d399';
  if (type.includes('mood')) return '#ec4899';
  if (type.includes('challenge') || type.includes('points')) return '#fbbf24';
  if (type.includes('weekly') || type.includes('recap')) return '#38bdf8';
  if (type.includes('welcome')) return '#a78bfa';
  return '#6366f1';
}

async function displayAppNotification(data) {
  try {
    await notifee.displayNotification({
      id: `${data.type || 'notif'}:${Date.now()}`,
      title: data.title || 'Notification',
      body: data.body || '',
      android: {
        channelId: 'app_notifications',
        pressAction: { id: 'default' },
        sound: 'default',
        color: getNotifColor(data.type),
        importance: AndroidImportance.HIGH,
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: ['alert', 'sound', 'badge'],
      },
      data: { ...data },
    });
  } catch (e) {
    console.log('[Notifee] displayAppNotification failed:', e);
  }
}

function handleNotificationPress(data) {
  if (!data?.type) return;
  const type = data.type;

  setTimeout(() => {
    try {
      if (type === 'chat' && data.peerUserId) {
        navigationRef.current?.navigate('chat', {
          peerUserId: data.peerUserId,
          peerName: data.peerName,
        });
      } else if (type === 'friend_request') {
        navigationRef.current?.navigate('FriendRequests');
      } else if (
        type === 'friend_accepted' ||
        type === 'friend_declined' ||
        type === 'friend_removed'
      ) {
        navigationRef.current?.navigate('Friends');
      } else if (type.includes('streak')) {
        navigationRef.current?.navigate('Home');
      } else if (type.includes('leaderboard') || type.includes('rank')) {
        navigationRef.current?.navigate('Leaderboard');
      } else if (type.includes('mood')) {
        navigationRef.current?.navigate('MoodMap');
      } else if (type.includes('challenge')) {
        navigationRef.current?.navigate('Challenges');
      } else if (type === 'weekly_recap' || type === 'points_milestone') {
        navigationRef.current?.navigate('Profile');
      } else {
        // admin_broadcast, welcome_back, general → Home
        navigationRef.current?.navigate('Home');
      }
    } catch (e) {
      console.log('[Nav] handleNotificationPress error:', e);
    }
  }, 300);
}

// Store pending navigation for when app is killed and opened via notification
export const notificationNavState = { pending: null };

/*
|--------------------------------------------------------------------------
| Firebase Background Message Handler
|--------------------------------------------------------------------------
*/

const firebaseApp = getApp();
const messagingInstance = getMessaging(firebaseApp);

setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
  const data = remoteMessage?.data || {};

  // ── Chat ──
  if (data.type === 'chat') {
    const incomingMessageId = String(data.messageId || data.msgId || data._id || '');
    if (incomingMessageId) {
      try {
        setSecretKey();
        const tokens = await UserStorage.getTokens?.();
        if (tokens?.accessToken) {
          apiClient.setAuthToken?.(tokens.accessToken);
        }
        await markDelivered([incomingMessageId]);
        console.log('[BGHandler] ✅ Delivered:', incomingMessageId);
      } catch (e) {
        console.log('[BGHandler] ❌ markDelivered failed:', e);
      }
    }

    const peerId = String(data.peerUserId || 'unknown');
    const peerName = data.username || data.peerName || 'Someone';
    const messageId = data.messageId || data.msgId || data._id || Date.now();
    const body = data.body || data.message || 'Sent you a message';

    await notifee.displayNotification({
      id: `chat:${peerId}:msg:${messageId}`,
      title: peerName,
      body,
      android: {
        channelId: 'default',
        groupId: `chat:${peerId}`,
        pressAction: { id: 'default' },
        sound: 'default',
        color: '#6366f1',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: ['alert', 'sound', 'badge'],
      },
      data: { type: 'chat', peerUserId: peerId, peerName },
    });
    return;
  }

  // ── Seen / Delivered signals — no display needed ──
  if (data.type === 'seen') {
    markMessagesSeenLocally(data.peerUserId);
    return;
  }

  if (data.type === 'delivered') {
    const ids = parseMessageIds(data.messageIds);
    markMessagesDeliveredLocally(data.peerUserId, ids);
    return;
  }

  // ── All app notifications ──
  if (data.type && data.title) {
    await displayAppNotification(data);
  }
});

/*
|--------------------------------------------------------------------------
| Notifee Background Press Handler
|--------------------------------------------------------------------------
*/

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail?.notification?.data) {
    const data = detail.notification.data;

    if (navigationRef.current) {
      handleNotificationPress(data);
    } else {
      notificationNavState.pending = data; // ✅ mutate property, not assignment
    }
  }
});

/*
|--------------------------------------------------------------------------
| Register App
|--------------------------------------------------------------------------
*/

AppRegistry.registerComponent(appName, () => App);