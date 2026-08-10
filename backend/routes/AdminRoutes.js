import express from 'express';
import { isAuthenticatedUser, isAdmin } from '../middlewares/auth.js'; 

// 1. Notification Controllers
import {
  adminBroadcast,
  adminNotifyUser,
  adminNotifyUsers,
  adminSendTemplate,
  adminNotifyStats,
  setUserTick,
  adminSuspendUser,
  adminBanUser,
  adminUnliftAccount,
  getAdminAppeals,
  resolveAppeal,
  getAllReports,
} from '../controllers/AdminController.js';
import { dismissReport } from '../controllers/ModerationController.js';

const router = express.Router();

// Apply global authentication and admin check to ALL admin routes below
router.use(isAuthenticatedUser, isAdmin);

// ── NOTIFICATION ROUTES ──
router.post('/notify/broadcast', adminBroadcast);
router.post('/notify/user/:userId', adminNotifyUser);
router.post('/notify/users', adminNotifyUsers);
router.post('/notify/template', adminSendTemplate);
router.get('/notify/stats', adminNotifyStats);

// ── USER VERIFICATION / TICK ROUTE ──
router.patch('/user/:id/tick', setUserTick);

// ── MODERATION & SUSPENSION ROUTES ──
// Suspend user (supports temporary e.g. 24 hours, or indefinite)
router.post('/user/suspend', adminSuspendUser);

// Permanently ban user
router.post('/user/ban', adminBanUser);

// Unlift / Restore suspended or banned account
router.post('/user/unlift', adminUnliftAccount);

// View pending appeals along with evidence/reports
router.get('/appeals', getAdminAppeals);

// Resolve appeal (Approve to restore account or Reject to ban)
router.post('/appeal/resolve', resolveAppeal);

router.get('/reports', getAllReports);
router.post('/report/dismiss', dismissReport);

export default router;