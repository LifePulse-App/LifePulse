import notifee, { AndroidImportance } from '@notifee/react-native';

export async function ensureMessagesChannel() {
  await notifee.createChannel({
    id: 'messages',
    name: 'Messages',
    importance: AndroidImportance.HIGH,
  });
}

export async function showIncomingMessageNotification(username?: string) {
  await ensureMessagesChannel();

  await notifee.displayNotification({
    title: 'New message',
    body: `${username || 'Someone'} sent you a message`,
    android: {
      channelId: 'messages',
      pressAction: { id: 'default' },
      timestamp: Date.now(),
      showTimestamp: true,
    },
  });
}