import PushToken from '../models/PushToken.js';
import admin from '../firebaseAdmin.js';

// POST /api/push/register
// body: { token: string, platform?: 'android' | 'ios' }
// auth: Bearer token -> sets req.user
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

    // Detach token from other users
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
// body: { token: string, platform?: 'android' | 'ios' }
// auth: Bearer token -> sets req.user
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

// data.peerUserId = sender id; username = sender's display name
// Helper for any notification type
async function sendNotificationFCM(tokens, payload) {
  console.log("ok");
  for (const t of tokens) {
    try {
      await admin.messaging().send({
        token: t.token,
        data: payload,
        android: { priority: 'high' },
      });
    } catch (err) {
      // Remove invalid/expired tokens
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.errorInfo?.code === 'messaging/registration-token-not-registered'
      ) {
        await PushToken.deleteOne({ token: t.token });
        console.log("deleted token");
      } else {
        console.error('[push] Failed to send to token', t.token, err.code, err.message);
      }
    }
  }
}

// Usage in /chat notification:
export async function sendMsgNotification(toUserId, fromUserId, fromUsername) {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
   //console.log('Push tokens for user', toUserId, tokens);
  await sendNotificationFCM(tokens, {
    type: 'chat',
    peerUserId: String(fromUserId),
    username: fromUsername,
  });
}

// Usage in /seen notification:
export async function sendSeenNotification(toUserId, peerUserId) {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
  await sendNotificationFCM(tokens, {
    type: 'seen',
    peerUserId: String(peerUserId),
  });
}