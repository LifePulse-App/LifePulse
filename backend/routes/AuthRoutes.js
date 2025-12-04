import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  me,
  googleLogin,
  resendVerificationOtp,
  resetPasswordVerifyOtp,
  resetPasswordSetNew,
  verify2FALogin,
  enable2FAInit,
  enable2FAConfirm,
  disable2FA,
  getDevices,
  logoutDevice
} from "../controllers/AuthController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { verifyEmail } from "../controllers/OtpController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendVerificationOtp);
router.post("/login", login);
router.post("/2fa/verify-login", verify2FALogin);
router.post("/2fa/enable/init", isAuthenticatedUser, enable2FAInit);
router.post("/2fa/enable/confirm", isAuthenticatedUser, enable2FAConfirm);
router.post("/2fa/disable", isAuthenticatedUser, disable2FA);
router.post("/sso/google", googleLogin);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/verify-otp", resetPasswordVerifyOtp);
router.post("/reset-password/verified-otp", resetPasswordSetNew);
router.post("/logout", isAuthenticatedUser, logout);
router.get("/me", isAuthenticatedUser, me);
router.get("/devices", isAuthenticatedUser, getDevices);
router.post("/devices/logout", isAuthenticatedUser, logoutDevice);

export default router;
