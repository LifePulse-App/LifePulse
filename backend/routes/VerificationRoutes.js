// routes/verificationRoutes.js
import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { checkAccountStatus } from "../middlewares/CheckAccountStatus.js";
import {
  submitVerification,
  getVerificationStatus,
} from "../controllers/VerificationController.js";

const router = express.Router();

// --- User-Facing Routes ---
router.post("/submit", isAuthenticatedUser, checkAccountStatus, submitVerification);
router.get("/status", isAuthenticatedUser, getVerificationStatus);

export default router;