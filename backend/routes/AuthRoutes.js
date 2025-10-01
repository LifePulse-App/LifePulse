import express from "express";
import {
  register,
  login,
  ssoLogin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  me,
} from "../controllers/AuthController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { verifyEmail } from "../controllers/OtpController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/sso-login", ssoLogin);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:resetToken", resetPassword);
router.post("/logout", isAuthenticatedUser, logout);
router.get("/me", isAuthenticatedUser, me);

export default router;
