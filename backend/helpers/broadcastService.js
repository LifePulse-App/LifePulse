// services/broadcastService.js
import admin from '../firebaseAdmin.js';
import PushToken from '../models/PushToken.js';
import User from '../models/UserSchema.js';

function buildMessage(token, notification) {
  const isAndroid = token.platform === 'android';
  const isIOS = token.platform === 'ios';

  const msg = {
    token: token.token,
    // data-only — no notification key so FCM doesn't auto-display
    data: {
      type: notification.type || 'general',
      title: notification.title || '',
      body: notification.body || '',
      ...(notification.extra
        ? Object.fromEntries(
            Object.entries(notification.extra).map(([k, v]) => [k, String(v ?? '')])
          )
        : {}),
    },
  };

  if (isAndroid) {
    msg.android = {
      priority: 'high',
      // NO android.notification key — notifee handles display
    };
  }

  if (isIOS) {
    msg.apns = {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          // content-available wakes the app silently
          // alert makes iOS show it even if app is killed
          alert: {
            title: notification.title,
            body: notification.body,
          },
          sound: 'default',
          'content-available': 1,
          'mutable-content': 1,
        },
      },
    };
  }

  return msg;
}

// Send to one user
export async function sendToUser(userId, notification) {
  try {
    const tokens = await PushToken.find({ userId }).lean();
    if (!tokens.length) return 0;

    for (const t of tokens) {
      try {
        await admin.messaging().send(buildMessage(t, notification));
      } catch (e) {
        if (
          e.code === 'messaging/registration-token-not-registered' ||
          e.errorInfo?.code === 'messaging/registration-token-not-registered'
        ) {
          await PushToken.deleteOne({ token: t.token });
        } else {
          console.error('[Push] sendToUser error:', e.code);
        }
      }
    }
    return tokens.length;
  } catch (e) {
    console.error('[Push] sendToUser failed:', e.message);
    return 0;
  }
}

// Send to multiple specific users
export async function sendToUsers(userIds, notification) {
  let sent = 0;
  for (const id of userIds) {
    sent += await sendToUser(id, notification);
  }
  return sent;
}

// Broadcast to all users in batches
export async function broadcastToAll(notificationOrFn, userFilter = {}) {
  const BATCH = 500;
  let skip = 0;
  let totalSent = 0;

  while (true) {
    const users = await User.find(userFilter)
      .select('_id name streak points')
      .skip(skip)
      .limit(BATCH)
      .lean();

    if (!users.length) break;

    const userIds = users.map(u => u._id);
    const tokens = await PushToken.find({ userId: { $in: userIds } }).lean();

    if (tokens.length) {
      const messages = tokens.map(t => {
        const user = users.find(u => String(u._id) === String(t.userId));
        const notif =
          typeof notificationOrFn === 'function'
            ? notificationOrFn(user)
            : notificationOrFn;
        return buildMessage(t, notif);
      });

      for (let i = 0; i < messages.length; i += 500) {
        const chunk = messages.slice(i, i + 500);
        try {
          const result = await admin.messaging().sendEach(chunk);
          totalSent += result.successCount;
          result.responses.forEach((r, idx) => {
            if (
              r.error?.code === 'messaging/registration-token-not-registered' ||
              r.error?.errorInfo?.code === 'messaging/registration-token-not-registered'
            ) {
              PushToken.deleteOne({ token: chunk[idx].token }).catch(() => {});
            }
          });
        } catch (e) {
          console.error('[Broadcast] sendEach error:', e.message);
        }
      }
    }

    skip += BATCH;
    console.log(`[Broadcast] Processed ${skip} users, sent ${totalSent}`);
  }

  console.log(`[Broadcast] Done. Total: ${totalSent}`);
  return totalSent;
}