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
  resetPasswordSetNew
} from "../controllers/AuthController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { verifyEmail } from "../controllers/OtpController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendVerificationOtp);
router.post("/login", login);
router.post("/sso/google", googleLogin);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/verify-otp", resetPasswordVerifyOtp);
router.post("/reset-password/verified-otp", resetPasswordSetNew);
router.post("/logout", isAuthenticatedUser, logout);
router.get("/me", isAuthenticatedUser, me);

export default router;
