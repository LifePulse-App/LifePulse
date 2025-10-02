import User from "../models/UserSchema.js";
import Jwt from "jsonwebtoken";
import crypto from "crypto";
import validator from "validator"
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import { sendResetPasswordEmail, sendVerificationEmail, verifyEmail } from "./OtpController.js";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to send access + refresh tokens
const sendTokens = async (res, user, deviceId) => {                
  const accessToken = user.getJwtToken();
  const refreshToken = user.getRefreshToken(deviceId || "Unknown");

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      providers: user.providers,
    },
  };
};

// Registration
export const register = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, username, phone } = req.body;

    if (!name || !email || !password) {
      return next(new ErrorHandler("Name, Username and Password is Required", 400));
    }

    if (!validator.isEmail(email)) {
      return next(new ErrorHandler("Invalid email format", 400));
    }

    if (await User.findOne({ email })) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    if (username && (await User.findOne({ username }))) {
      return next(new ErrorHandler("Username already exists", 400));
    }

    if (phone && (await User.findOne({ phone }))) {
      return next(new ErrorHandler("Phone number already exists", 400));
    }

    const user = await User.create({ name, email, password, username, phone, isVerified: false });

    // Generate OTP
    const otp = user.generateVerificationCode();

    // Send OTP
    await sendVerificationEmail(email, otp);

    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "User registered. Verification code sent to email.",
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Server error", 500));
  }
});



// Login
export const login = catchAsyncErrors(async (req, res, next) => {
  try {
    const { identifier, password, deviceId } = req.body;

    if (!identifier || !password) {
      return next(new ErrorHandler("Credentials Missing", 400));
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).select("+password");

    if (!user) return next(new ErrorHandler("Invalid credentials", 401));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new ErrorHandler("Invalid credentials", 401));

    const tokens = await sendTokens(res, user, deviceId);
    res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    return next(new ErrorHandler("Server error", 500));
  }
});

// Me
export const me = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select("-password -resetPasswordToken -resetPasswordExpire -verificationCode -verificationCodeExpire");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// 🔹 Google Login
export const googleLogin = catchAsyncErrors(async (req, res, next) => {
  try {
    const { idToken, deviceId } = req.body;

    if (!idToken) {
      return next(new ErrorHandler("Missing Google ID token", 400));
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: providerId, email, name } = payload;

    // Forward to common SSO handler
    return ssoLoginHandler(req, res, next, {
      provider: "google",
      providerId,
      email,
      name,
      deviceId,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Invalid Google token", 401));
  }
});

// 🔹 Common Handler
const ssoLoginHandler = async (req, res, next, { provider, providerId, email, name, deviceId }) => {
  try {
    let user = await User.findOne({ email });

    if (user) {
      const existingProvider = user.providers.find(
        (p) => p.provider === provider && p.providerId === providerId
      );

      if (!existingProvider) {
        user.providers.push({ provider, providerId, deviceId });
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = await User.create({
        name,
        email,
        providers: [{ provider, providerId, deviceId }],
      });
    }

    const tokens = await sendTokens(res, user, deviceId);
    return res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
};

// Refresh Token
export const refreshToken = catchAsyncErrors(async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new ErrorHandler("No refresh token provided", 401));

    const decoded = Jwt.verify(token, process.env.REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return next(new ErrorHandler("User not found", 401));

    const storedToken = user.refreshTokens.find((t) => t.token === token);
    if (!storedToken) return next(new ErrorHandler("Invalid token", 401));

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    await user.save({ validateBeforeSave: false });

    const tokens = await sendTokens(res, user, storedToken.deviceId);
    res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});

// Logout (per device)
export const logout = catchAsyncErrors(async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(new ErrorHandler("User not found", 404));

    const tokenExists = user.refreshTokens.some((t) => t.token === token);
    if (!tokenExists) {
      return next(new ErrorHandler("Invalid or already logged out token", 400));
    }

    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== token
    );
    
    await user.save({ validateBeforeSave: false });
    

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    return next(new ErrorHandler("Server error", 500));
  }
});


// Forgot Password
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) return next(new ErrorHandler("Enter email", 401));

    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandler("User not found", 404));

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;

    await sendResetPasswordEmail(user.email, resetUrl);

    res.status(200).json({
      success: true,
      message: `Reset token sent to ${user.email}`,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Server error", 500));
  }
});


// Reset Password
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return next(new ErrorHandler("Invalid or expired token", 400));

    user.password = req.body.password;
    if(!req.body.password) return next(new ErrorHandler("Enter Password", 401));
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens = [];
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    return next(new ErrorHandler("Server error", 500));
  }
});
