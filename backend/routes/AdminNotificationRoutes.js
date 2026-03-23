// routes/adminNotificationRoutes.js
import express from 'express';
import { isAuthenticatedUser, isAdmin } from '../middlewares/auth.js'; // ← your actual names
import {
  adminBroadcast,
  adminNotifyUser,
  adminNotifyUsers,
  adminSendTemplate,
  adminNotifyStats,
} from '../controllers/adminNotificationController.js';

const router = express.Router();

// Use YOUR middleware names
router.use(isAuthenticatedUser, isAdmin);

router.post('/broadcast', adminBroadcast);
router.post('/user/:userId', adminNotifyUser);
router.post('/users', adminNotifyUsers);
router.post('/template', adminSendTemplate);
router.get('/stats', adminNotifyStats);

export default router;