import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { checkAccountStatus } from "../middlewares/CheckAccountStatus.js"; // ⚡ Suspension guard middleware
import {
  reportUser,
  submitAppeal,
} from "../controllers/ModerationController.js"; // Or point to wherever your moderation controllers are stored

const router = express.Router();

// --- ⚡ Moderation Routes (Block, Unblock, Report, Appeal) ---

// Report a user (requires active account)
router.post("/user/:targetUserId/report", isAuthenticatedUser, checkAccountStatus, reportUser);

// Submit an appeal (Allowed even when suspended, so we omit checkAccountStatus)
router.post("/user/appeal", isAuthenticatedUser, submitAppeal);

export default router;