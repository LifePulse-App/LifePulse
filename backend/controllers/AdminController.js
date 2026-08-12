// controllers/adminNotificationController.js
import { broadcastToAll, sendToUser, sendToUsers } from '../helpers/broadcastService.js';
import { TEMPLATES } from '../utils/notificationTemplates.js';
import User from '../models/UserSchema.js';
import PushToken from '../models/PushToken.js';
import Report from "../models/ReportSchema.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";

// ⚡ Imported premium email templates
import { 
  sendSuspensionEmail, 
  sendBanEmail, 
  sendUnliftEmail, 
  sendAppealDecisionEmail 
} from '../helpers/emails.js';

// POST /api/admin/user/suspend
export const adminSuspendUser = catchAsyncErrors(async (req, res, next) => {
  const { userId, reason, durationHours } = req.body; 

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  let liftAtDate = null;
  if (durationHours && !isNaN(durationHours)) {
    liftAtDate = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000);
  }

  const actualReason = reason || 'Violation of community guidelines.';

  user.accountStatus = 'suspended';
  user.suspensionDetails = {
    reason: actualReason,
    suspendedAt: new Date(),
    liftAt: liftAtDate,
  };

  // Blank pointers to hide them from platform features (search, leaderboards)
  user.partner = null;
  user.partnerSince = null;
  user.partnerGracePeriodEnd = null;

  await user.save();

  // ⚡ SEND EMAIL ASYNC (Fire and forget)
  sendSuspensionEmail({
    to: user.email,
    username: user.name || user.username,
    reason: actualReason,
    liftAt: liftAtDate
  }).catch(err => console.error("Suspension email failed:", err));

  res.json({ 
    success: true, 
    message: liftAtDate 
      ? `User suspended successfully for ${durationHours} hours.` 
      : "User suspended indefinitely." 
  });
});

// POST /api/admin/user/ban
export const adminBanUser = catchAsyncErrors(async (req, res, next) => {
  const { userId, reason } = req.body;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const actualReason = reason || 'Permanent ban for severe policy violation.';

  user.accountStatus = 'banned';
  user.suspensionDetails = {
    reason: actualReason,
    suspendedAt: new Date(),
    liftAt: null,
  };

  user.partner = null;
  await user.save();

  // ⚡ SEND BAN EMAIL
  sendBanEmail({
    to: user.email,
    username: user.name || user.username,
    reason: actualReason
  }).catch(err => console.error("Ban email failed:", err));

  res.json({ success: true, message: "User permanently banned." });
});

// POST /api/admin/user/unlift
export const adminUnliftAccount = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.accountStatus = 'active';
  user.suspensionDetails = undefined;
  user.appealDetails = { status: 'none' };

  // Dismiss pending reports so they don't instantly trigger re-suspension
  await Report.updateMany({ reportedUser: userId, status: 'pending' }, { $set: { status: 'dismissed' } });

  await user.save();

  // ⚡ SEND UNLIFT EMAIL
  sendUnliftEmail({
    to: user.email,
    username: user.name || user.username
  }).catch(err => console.error("Unlift email failed:", err));

  res.json({ success: true, message: "Account restriction lifted. User is now active." });
});

// GET /api/admin/appeals
export const getAdminAppeals = catchAsyncErrors(async (req, res, next) => {
  // Find users who have a pending appeal
  const suspendedUsers = await User.find({ "appealDetails.status": "pending" })
    .select("name username email accountStatus suspensionDetails appealDetails")
    .lean();

  const appealsWithEvidence = [];

  for (const user of suspendedUsers) {
    // Fetch all pending reports/proof filed against this user
    const reportsAgainstUser = await Report.find({ reportedUser: user._id })
      .populate("reporter", "name username")
      .select("reason details createdAt reporter")
      .lean();

    appealsWithEvidence.push({
      user,
      suspensionReason: user.suspensionDetails?.reason || "Multiple policy violations",
      suspendedAt: user.suspensionDetails?.suspendedAt,
      appealText: user.appealDetails?.appealText,
      appealSubmittedAt: user.appealDetails?.submittedAt,
      evidenceReports: reportsAgainstUser, // The proof
    });
  }

  res.json({
    success: true,
    count: appealsWithEvidence.length,
    appeals: appealsWithEvidence,
  });
});

// POST /api/admin/appeal/resolve
export const resolveAppeal = catchAsyncErrors(async (req, res, next) => {
  const { userId, decision, moderatorNote } = req.body; 

  if (!userId || !['approve', 'reject'].includes(decision)) {
    return next(new ErrorHandler("Valid userId and decision ('approve' or 'reject') required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const note = moderatorNote || (decision === 'approve' ? "Your account has been fully restored." : "Your account activity violates our Terms of Service. This decision is final.");

  if (decision === 'approve') {
    user.accountStatus = 'active';
    user.suspensionDetails = undefined;
    user.appealDetails = { status: 'approved' };
    await Report.updateMany({ reportedUser: userId, status: 'pending' }, { $set: { status: 'dismissed' } });
  } else {
    // We leave their current accountStatus (suspended) intact, and mark appeal as rejected
    user.appealDetails = { 
      status: 'rejected',
      response: note
    };
  }

  await user.save();

  // ⚡ SEND APPEAL DECISION EMAIL
  sendAppealDecisionEmail({
    to: user.email,
    username: user.name || user.username,
    decision,
    note
  }).catch(err => console.error("Appeal decision email failed:", err));

  res.json({ success: true, message: `Appeal ${decision}d successfully.` });
});

// POST /api/admin/report/dismiss
export const dismissReport = catchAsyncErrors(async (req, res, next) => {
  const { reportId } = req.body;

  if (!reportId) {
    return next(new ErrorHandler("Report ID is required.", 400));
  }

  const report = await Report.findById(reportId);
  
  if (!report) {
    return next(new ErrorHandler("Report not found.", 404));
  }

  report.status = 'dismissed';
  await report.save();

  res.json({ success: true, message: "Report dismissed successfully." });
});

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

// GET /api/admin/reports
export const getAllReports = catchAsyncErrors(async (req, res, next) => {
  const reports = await Report.find({})
    .populate("reporter", "name username email")
    .populate("reportedUser", "name username email accountStatus")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    count: reports.length,
    reports,
  });
});