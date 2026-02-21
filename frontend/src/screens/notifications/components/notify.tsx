import notifee, { AndroidImportance } from '@notifee/react-native';

/**
 * Ensure a notification channel for messages exists.
 * Set sound: 'default' to play sound, and disable vibration here.
 *
 * NOTE: Android channels are persistent. If you've previously created
 * the same channel id without sound, changes may not apply until you:
 * - uninstall & reinstall the app (dev), OR
 * - use a new channel id (e.g. 'messages_v2'), OR
 * - ask the user to change the channel sound in system settings.
 */
export async function ensureMessagesChannel() {
  await notifee.createChannel({
    id: 'messages',               // keep or bump to messages_v2 if needed
    name: 'Messages',
    importance: AndroidImportance.HIGH,
    sound: 'default',             // enable system default sound
    vibration: false,             // disable vibration on channel level
  });
}

/**
 * Show an incoming message notification and a per-sender group summary.
 *
 * Call with:
 *   showIncomingMessageNotification({ username, peerUserId, messageId, preview })
 *
 * - peerUserId is REQUIRED for grouping per sender.
 * - messageId should be unique per message (fallback to timestamp).
 */
export async function showIncomingMessageNotification({
  username,
  peerUserId,
  messageId,
  preview,
}: {
  username?: string;
  peerUserId?: string;
  messageId?: string | number;
  preview?: string;
}) {
  await ensureMessagesChannel();

  const peerId = String(peerUserId ?? 'unknown');
  const title = username || 'Someone';
  const body = preview ?? `${username || 'Someone'} sent you a message`;
  const msgId = messageId ?? Date.now();

  const groupId = `chat:${peerId}`; // groups notifications per sender
  const summaryId = `chat-summary:${peerId}`;

  // 1) Individual message notification (plays sound)
  await notifee.displayNotification({
    id: `msg:${peerId}:${msgId}`,
    title,
    body,
    android: {
      channelId: 'messages',
      pressAction: { id: 'default' },
      timestamp: Date.now(),
      showTimestamp: true,
      groupId,
      // request sound for this notification (channel ultimately controls behavior)
      sound: 'default',
      // ensure we don't add vibration here (channel already set)
      vibrationPattern: undefined,
    },
    data: {
      type: 'chat',
      peerUserId: peerId,
      messageId: String(msgId),
    },
  });

  // 2) Group summary for this sender (required for reliable grouping)
  // Make the summary silent to avoid duplicate sounds on some devices.
  await notifee.displayNotification({
    id: summaryId,
    title,
    body: 'New messages',
    android: {
      channelId: 'messages',
      groupId,
      groupSummary: true,
      pressAction: { id: 'default' },
      // silence the summary to avoid double sound (channel may still allow sound,
      // but many OEMs ignore per-notification sound; uninstall/reinstall may be needed).
      sound: undefined,
      vibrationPattern: undefined,
    },
    data: {
      type: 'chat_summary',
      peerUserId: peerId,
    },
  });
}