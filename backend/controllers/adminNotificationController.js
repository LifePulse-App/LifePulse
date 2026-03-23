// controllers/adminNotificationController.js
import { broadcastToAll, sendToUser, sendToUsers } from '../helpers/broadcastService.js';
import { TEMPLATES } from '../utils/notificationTemplates.js';
import User from '../models/UserSchema.js';
import PushToken from '../models/PushToken.js';

// POST /api/admin/notify/broadcast
export const adminBroadcast = async (req, res) => {
  try {
    const { title, body, filter } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body required' });
    }
    const count = await broadcastToAll(
      TEMPLATES.ADMIN_BROADCAST(title, body),
      filter || {}
    );
    res.json({ success: true, sent: count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/admin/notify/user/:userId
export const adminNotifyUser = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body required' });
    }
    await sendToUser(req.params.userId, TEMPLATES.ADMIN_DIRECT(title, body));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/admin/notify/users
export const adminNotifyUsers = async (req, res) => {
  try {
    const { userIds, title, body } = req.body;
    if (!userIds?.length || !title || !body) {
      return res.status(400).json({ success: false, message: 'userIds, title and body required' });
    }
    const count = await sendToUsers(userIds, TEMPLATES.ADMIN_DIRECT(title, body));
    res.json({ success: true, sent: count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/admin/notify/template
export const adminSendTemplate = async (req, res) => {
  try {
    const { template, params, filter } = req.body;
    if (!TEMPLATES[template]) {
      return res.status(400).json({ success: false, message: `Unknown template: ${template}` });
    }
    const notif = TEMPLATES[template](...(params || []));
    const count = await broadcastToAll(notif, filter || {});
    res.json({ success: true, template, sent: count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/admin/notify/stats
export const adminNotifyStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithTokens = await PushToken.distinct('userId');
    const totalTokens = await PushToken.countDocuments();
    const androidTokens = await PushToken.countDocuments({ platform: 'android' });
    const iosTokens = await PushToken.countDocuments({ platform: 'ios' });
    res.json({
      success: true,
      stats: {
        totalUsers,
        reachableUsers: usersWithTokens.length,
        totalTokens,
        androidTokens,
        iosTokens,
        reachablePercent: Math.round((usersWithTokens.length / totalUsers) * 100),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PATCH /api/admin/user/:id/tick
export const setUserTick = async (req, res, next) => {
  const { tick } = req.body;
  if (!["none", "verified", "golden"].includes(tick)) {
    return next(new ErrorHandler("Invalid tick value", 400));
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { tick },
    { new: true }
  ).select("name username tick");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.json({ success: true, user });
};