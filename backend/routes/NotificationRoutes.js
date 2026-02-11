import { Router } from 'express';
import { registerPushToken, unregisterPushToken } from '../controllers/NotificationController.js';
import { isAuthenticatedUser } from '../middlewares/auth.js';

const router = Router();

router.post('/register',isAuthenticatedUser, registerPushToken);
router.post('/unregister',isAuthenticatedUser, unregisterPushToken);

export default router;