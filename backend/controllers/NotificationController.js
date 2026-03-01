import PushToken from '../models/PushToken.js';
import admin from '../firebaseAdmin.js';

// POST /api/push/register
export const registerPushToken = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { token, platform = 'android' } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    // detach from other users
    await PushToken.deleteMany({ token, userId: { $ne: userId } });

    const pushTokenDoc = await PushToken.findOneAndUpdate(
      { token },
      { $set: { userId, token, platform, lastSeenAt: new Date() } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        id: pushTokenDoc._id,
        userId: pushTokenDoc.userId,
        platform: pushTokenDoc.platform,
        token: pushTokenDoc.token,
        lastSeenAt: pushTokenDoc.lastSeenAt,
      },
    });
  } catch (err) {
    console.error('Error registering push token:', err);
    return res.status(500).json({ success: false, message: 'Failed to register push token' });
  }
};

// POST /api/push/unregister
export const unregisterPushToken = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { token, platform = 'android' } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    const result = await PushToken.deleteOne({ userId, token, platform });

    return res.status(200).json({
      success: true,
      message: 'Push token unregistered successfully',
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('Error unregistering push token:', err);
    return res.status(500).json({ success: false, message: 'Failed to unregister push token' });
  }
};

async function sendNotificationFCM(tokens, payload) {
  for (const t of tokens) {
    try {
      await admin.messaging().send({
        token: t.token,
        data: payload,
        android: { priority: 'high' },
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.errorInfo?.code === 'messaging/registration-token-not-registered'
      ) {
        await PushToken.deleteOne({ token: t.token });
        console.log('[push] deleted invalid token');
      } else {
        console.error('[push] Failed to send to token', t.token, err.code, err.message);
      }
    }
  }
}

/**
 * CHAT push
 * IMPORTANT: pass REAL message _id so receiver can call markDelivered([messageId])
 */
export async function sendMsgNotification(toUserId, fromUserId, fromUsername, messageId, bodyText = 'Sent you a message') {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
  if (!tokens.length) return;

  await sendNotificationFCM(tokens, {
    type: 'chat',
    peerUserId: String(fromUserId),
    peerName: String(fromUsername || 'Someone'),
    username: String(fromUsername || 'Someone'),
    body: String(bodyText || 'Sent you a message'),
    messageId: String(messageId), // ✅ REAL Mongo message _id
  });
}

/**
 * SEEN push
 */
export async function sendSeenNotification(toUserId, peerUserId) {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
  if (!tokens.length) return;

  await sendNotificationFCM(tokens, {
    type: 'seen',
    peerUserId: String(peerUserId),
  });
}

/**
 * DELIVERED push (like seen)
 * toUserId = sender (who should see double-tick update)
 * peerUserId = receiver (who delivered the message)
 */
export async function sendDeliveredNotification(toUserId, peerUserId, messageIds = []) {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
  if (!tokens.length) return;

  await sendNotificationFCM(tokens, {
    type: 'delivered',
    peerUserId: String(peerUserId),
    messageIds: JSON.stringify((messageIds || []).map(String)),
  });
}