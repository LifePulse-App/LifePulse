import express from 'express';
import { isAuthenticatedUser } from '../middlewares/auth.js';
import { getMonthlyLeaderboard, getPermanentLeaderboard } from '../controllers/LeaderboardController.js';

const router = express.Router();

router.get('/monthly', isAuthenticatedUser, getMonthlyLeaderboard);
router.get('/permanent', isAuthenticatedUser, getPermanentLeaderboard);

export default router;