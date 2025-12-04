import express from "express";
import {
  getProfile,
  editProfile,
  changeNumber,
  getLinkedAccounts,
  requestEmailChange,
  verifyEmailChange,
  manageLinkedAccounts,
  updateAvatarOrBitmoji,
  updateNotifications,
  updateAppSettings,
  deleteAccount,
  getLoginActivity,
  changePasswordWithOtp,
  requestPasswordChangeOtp,
  getAvatarConfig,
  updateAvatarConfig,
  getAvatarUrl,
  updateAvatarUrl
} from "../controllers/ProfileController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

// Profile Info
router.get("/", isAuthenticatedUser, getProfile);
router.put("/", isAuthenticatedUser, editProfile);
router.post("/change-password", isAuthenticatedUser, changePasswordWithOtp);
router.post("/change-password-otp", isAuthenticatedUser, requestPasswordChangeOtp);
router.post("/change-number", isAuthenticatedUser, changeNumber);

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

router.get("/login-activity", isAuthenticatedUser, getLoginActivity);
router.get('/me/avatar', isAuthenticatedUser, getAvatarConfig);
router.post('/me/avatar', isAuthenticatedUser, updateAvatarConfig);
router.get('/me/avatar-url', isAuthenticatedUser, getAvatarUrl);
router.post('/me/avatar-url', isAuthenticatedUser, updateAvatarUrl);


export default router;