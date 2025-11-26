import express from "express";
import {
  getProfile,
  editProfile,
  changePassword,
  changeNumber,
  getLinkedAccounts,
  requestEmailChange,
  verifyEmailChange,
  manageLinkedAccounts,
  updateAvatarOrBitmoji,
  updateNotifications,
  updateAppSettings,
  deleteAccount,
  getLoginActivity
} from "../controllers/ProfileController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

// Profile Info
router.get("/", isAuthenticatedUser, getProfile);
router.put("/", isAuthenticatedUser, editProfile);
router.post("/change-password", isAuthenticatedUser, changePassword);
router.post("/change-password-otp", isAuthenticatedUser, requestPasswordChangeOtp);
router.post("/change-number", isAuthenticatedUser, changeNumber);

// Linked Accounts and Secure Email Change
router.get("/linked-accounts", isAuthenticatedUser, getLinkedAccounts); // View registered email
router.post("/linked-accounts/request-email-change", isAuthenticatedUser, requestEmailChange); // Start email change (send OTP)
router.post("/linked-accounts/verify-email-change", isAuthenticatedUser, verifyEmailChange); // Complete email change (verify OTP)
router.post("/linked-accounts", isAuthenticatedUser, manageLinkedAccounts); // (just shows registered email)

// Avatar/Bitmoji
router.put("/avatar", isAuthenticatedUser, updateAvatarOrBitmoji);

// Notifications
router.post("/notifications", isAuthenticatedUser, updateNotifications);

// App Settings
router.post("/app-settings", isAuthenticatedUser, updateAppSettings);

// Account Delete
router.delete("/delete", isAuthenticatedUser, deleteAccount);

// Login Activity
router.get("/login-activity", isAuthenticatedUser, getLoginActivity);


export default router;