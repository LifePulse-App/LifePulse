import express from "express";
import {
  register,
  login,
  ssoLogin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/AuthController.js";
import { isAuthenticatedUser} from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/sso-login", ssoLogin);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:resetToken", resetPassword);
router.post("/logout", isAuthenticatedUser, logout);

export default router;
