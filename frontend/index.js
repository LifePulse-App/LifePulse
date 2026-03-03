import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { Crypto } from '@peculiar/webcrypto';

if (!global.Buffer) global.Buffer = Buffer;
if (!global.crypto) global.crypto = new Crypto();
else if (!global.crypto.subtle) global.crypto.subtle = new Crypto().subtle;

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
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

const messagingInstance = getMessaging(getApp());

function parseMessageIds(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
  const data = remoteMessage?.data || {};

  if (data.type === 'chat') {
    const incomingMessageId = String(data.messageId || data.msgId || data._id || '');
    if (incomingMessageId) {
      try {
        await markDelivered([incomingMessageId]);
      } catch (e) {
        console.log('markDelivered (background) failed', e);
      }
    }

    // data-only path: show local notification
    const peerId = String(data.peerUserId || 'unknown');
    const peerName = data.username || data.peerName || 'Someone';
    const messageId = data.messageId || data.msgId || data._id || Date.now();
    const body = data.body || data.message || 'Sent you a message';
    const groupId = `chat:${peerId}`;

    await notifee.displayNotification({
      id: `chat:${peerId}:msg:${messageId}`,
      title: peerName,
      body,
      android: {
        channelId: 'default',
        groupId,
        pressAction: { id: 'default' },
      },
      data: {
        type: 'chat',
        peerUserId: peerId,
        peerName,
      },
    });
  }

  if (data.type === 'seen') {
    markMessagesSeenLocally(data.peerUserId);
  }

  if (data.type === 'delivered') {
    const ids = parseMessageIds(data.messageIds);
    markMessagesDeliveredLocally(data.peerUserId, ids);
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    navigationRef.current?.navigate('chat', {
             peerUserId: detail.notification.data.peerUserId,
             peerName: detail.notification.data.peerName,
           });
  }
});

AppRegistry.registerComponent(appName, () => App);