import User from "../models/UserSchema.js";
import Jwt from "jsonwebtoken";
import crypto from "crypto";
import validator from "validator"
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import { sendResetPasswordEmail, sendVerificationEmail, verifyEmail } from "./OtpController.js";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { decryptTOTPSecret, encryptTOTPSecret } from "../utils/crypto2fa.js";
import { lookupIpLocation } from "../utils/geoip.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Helper: register/update device info with IP geo location
const registerDeviceWithLocation = async ({
  user,
  deviceId,
  deviceName,
  deviceModel,
  deviceBrand,
  req,
}) => {
  if (!deviceId) return;

  // Get IP from headers/socket
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0] || req.socket.remoteAddress || "";

  const location = await lookupIpLocation(ip); // may be null
  const now = new Date();

  let device = user.deviceInfo.find((d) => d.deviceId === deviceId);
  if (device) {
    device.deviceName = deviceName || device.deviceName;
    device.deviceModel = deviceModel || device.deviceModel;
    device.deviceBrand = deviceBrand || device.deviceBrand;
    device.lastLogin = now;
    if (location) device.location = location;
  } else {
    user.deviceInfo.push({
      deviceId,
      deviceName,
      deviceModel,
      deviceBrand,
      lastLogin: now,
      location: location || undefined,
    });
  }

  await user.save({ validateBeforeSave: false });
};

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // 10-character alphanumeric code, e.g. "AB7D-3F9K"
    const plain = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    const formatted = `${plain.slice(0, 4)}-${plain.slice(4, 8)}-${plain.slice(8)}`;
    const codeHash = crypto.createHash("sha256").update(formatted).digest("hex");
    codes.push({ plain: formatted, codeHash });
  }
  return codes;
};

const sendTokens = async (res, user, deviceId) => {
  const accessToken = user.getJwtToken();
  const refreshToken = await user.getRefreshToken(deviceId || "Unknown");
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      providers: user.providers,
      twoFactorEnabled: user.twoFactor?.enabled || false,
    },
  };
};

const updateDeviceLogin = async (user, deviceId, deviceName, deviceModel, deviceBrand) => {
  let device = user.deviceInfo.find(d => d.deviceId === deviceId);
  if (device) {
    device.deviceName = deviceName;
    device.deviceModel = deviceModel;
    device.deviceBrand = deviceBrand;
    device.lastLogin = Date.now();
  } else {
    user.deviceInfo.push({ deviceId, deviceName, deviceModel, deviceBrand, lastLogin: Date.now() });
  }
  await user.save();
  return user;
};

// Registration
export const register = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, username, phone } = req.body;

    if (!name || !username || !email || !password) {
      return next(new ErrorHandler("Name, Username, Email and Password is Required", 400));
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

// At least 8 chars, 1 lowercase, 1 uppercase, 1 digit, no special required
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

if (!passwordRegex.test(password)) {
  return next(
    new ErrorHandler(
      "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one number.",
      400
    )
  );
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
    return next(new ErrorHandler(err, 500));
  }
});


export const resendVerificationOtp = catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    if (!validator.isEmail(email)) {
      return next(new ErrorHandler("Invalid email format", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (user.isVerified) {
      return next(new ErrorHandler("User already verified", 400));
    }

    const now = new Date();

    // If no window is set or window has passed → reset window
    if (!user.otpResendResetAt || user.otpResendResetAt <= now) {
      user.otpResendCount = 0;
      // New window: 1 hour from now
      user.otpResendResetAt = new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Check if user already hit the limit (3 per hour)
    if (user.otpResendCount >= 3) {
      const waitMs = user.otpResendResetAt.getTime() - now.getTime();
      const waitMinutes = Math.ceil(waitMs / (60 * 1000)); // round up

      return next(
        new ErrorHandler(
          `OTP resend limit reached. Try again in ${waitMinutes} minute(s).`,
          429 // Too Many Requests
        )
      );
    }

    // Generate new OTP
    const otp = user.generateVerificationCode();

    // Increment counter
    user.otpResendCount += 1;

    // Send OTP email
    await sendVerificationEmail(user.email, otp);

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Verification code resent to email.",
      remainingRequests: 3 - user.otpResendCount,
      resetAt: user.otpResendResetAt,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(err.message || "Internal Server Error", 500));
  }
});


// Login
export const login = catchAsyncErrors(async (req, res, next) => {
  try {
    const { identifier, password, deviceId, deviceName, deviceModel, deviceBrand } = req.body;

    if (!identifier || !password) {
      return next(new ErrorHandler("Credentials Missing", 400));
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).select("+password");

    if (!user) return next(new ErrorHandler("Invalid credentials", 401));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new ErrorHandler("Invalid credentials", 401));

    // If user has 2FA enabled → do not issue full tokens yet, and DO NOT fully register device here.
    if (user.twoFactor?.enabled && user.twoFactor.secret) {
      const twoFaToken = Jwt.sign(
        { id: user._id, stage: "2fa", deviceId },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      // Optionally you can do a light device registration here (without IP),
      // but since you want it after 2FA verification, we skip.
      return res.status(200).json({
        success: true,
        requires2fa: true,
        twoFaToken,
      });
    }

    // No 2FA: normal login → register device + location here
    const tokens = await sendTokens(res, user, deviceId);

    await registerDeviceWithLocation({
      user,
      deviceId,
      deviceName,
      deviceModel,
      deviceBrand,
      req,
    });

    res.status(200).json({ success: true, requires2fa: false, ...tokens });
  } catch (err) {
    console.error(err);
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

export const refreshToken = catchAsyncErrors(async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new ErrorHandler("No refresh token provided", 401));
    if (!process.env.REFRESH_SECRET) throw new Error("REFRESH_SECRET not set");

    const decoded = Jwt.verify(token, process.env.REFRESH_SECRET); // throws on exp/invalid
    const user = await User.findById(decoded.id);
    if (!user) return next(new ErrorHandler("User not found", 401));

    const now = Date.now();
    const storedToken = user.refreshTokens.find((t) => t.token === token);
    
    if (
      !storedToken ||
      new Date(storedToken.expiresAt).getTime() <= now ||
      storedToken.deviceId !== decoded.deviceId
    ) {
      return next(new ErrorHandler("Invalid or expired token", 401));
    }
    
    // rotate: remove the used token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    await user.save({ validateBeforeSave: false });
    
    const tokens = await sendTokens(res, user, storedToken.deviceId);
    return res.status(200).json({ success: true, ...tokens });

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


// Forgot Password (code-based)
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return next(new ErrorHandler("Please provide email or username", 400));
    }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Generate verification code
    const resetCode = user.generateResetCode();
    await user.save({ validateBeforeSave: false });

    // Send email with code
    await sendResetPasswordEmail(user.email, resetCode);

    // OPTIONAL: send WhatsApp message as well
    // await sendWhatsAppResetCode(user.phoneNumber, resetCode);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${user.email}`,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
});

export const resetPasswordVerifyOtp = catchAsyncErrors(async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return next(new ErrorHandler("Email and otp are required", 400));
    }

    const user = await User.findOne({
      $or: [{ email: email }, { username: email }],
    }).select("+resetPasswordCode +resetPasswordCodeExpire");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    const isCodeValid =
      user.resetPasswordCode &&
      user.resetPasswordCode === hashedCode &&
      user.resetPasswordCodeExpire &&
      user.resetPasswordCodeExpire > Date.now();

    if (!isCodeValid) {
      return next(new ErrorHandler("Invalid or expired code", 400));
    }

    // Mark as verified for reset (one-time)
    user.resetPasswordVerified = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Code verified. You can now reset your password.",
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
});

export const resetPasswordSetNew = catchAsyncErrors(async (req, res, next) => {
  try {
    const { emailOrUsername, newPassword } = req.body;

    if (!emailOrUsername || !newPassword) {
      return next(new ErrorHandler("Email/username and new password are required", 400));
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password +resetPasswordCode +resetPasswordCodeExpire +resetPasswordVerified");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Ensure OTP was verified and not expired
    const isStillValid =
      user.resetPasswordCode &&
      user.resetPasswordCodeExpire

    if (!user.resetPasswordVerified || !isStillValid) {
      return next(new ErrorHandler("You must verify the code again", 400));
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpire = undefined;
    user.resetPasswordVerified = false; // reset flag

        // 4) Disable 2FA and clear secrets/codes
        user.twoFactor.enabled = false;
        user.twoFactor.secret = undefined;
        user.twoFactor.backupCodes = [];
        user.twoFactor.lastVerified = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
});

export const enable2FAInit = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) return next(new ErrorHandler("User not found", 404));

    if (user.twoFactor?.enabled) {
      return next(
        new ErrorHandler("Two-factor authentication is already enabled", 400)
      );
    }

    // 1) Generate plain TOTP secret
    const plainSecret = authenticator.generateSecret();

    // 2) Encrypt secret before saving
    const encryptedSecret = encryptTOTPSecret(plainSecret);
    user.twoFactor.secret = encryptedSecret;
    user.twoFactor.enabled = false;
    await user.save({ validateBeforeSave: false });

    // 3) Use plain secret to generate otpauth URL (not the encrypted one)
    const issuer = "StreakSphere";
    const otpauthUrl = authenticator.keyuri(user.email, issuer, plainSecret);

    const qrImageDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.status(200).json({
      success: true,
      qrImageDataUrl,
      manualKey: plainSecret,
      otpauthUrl,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to initialize 2FA", 500));
  }
});

export const enable2FAConfirm = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { token } = req.body; // 6-digit code

    if (!token) {
      return next(new ErrorHandler("2FA code is required", 400));
    }

    const user = await User.findById(userId);
    if (!user) return next(new ErrorHandler("User not found", 404));

    // 🔐 decrypt the TOTP secret
    const plainSecret = decryptTOTPSecret(user.twoFactor.secret);
    if (!plainSecret) {
      return next(new ErrorHandler("2FA secret is corrupted", 500));
    }

    const isValid = authenticator.verify({
      token,
      secret: plainSecret,
    });

    if (!isValid) {
      return next(new ErrorHandler("Invalid 2FA code", 400));
    }

    // generate backup codes
    const generated = generateBackupCodes();
    user.twoFactor.backupCodes = generated.map((c) => ({
      codeHash: c.codeHash,
      used: false,
      usedAt: null,
    }));
    user.twoFactor.enabled = true;
    user.twoFactor.lastVerified = new Date();

    await user.save({ validateBeforeSave: false });

    const plainCodes = generated.map((c) => c.plain);

    return res.status(200).json({
      success: true,
      message: "Two-factor authentication enabled",
      backupCodes: plainCodes,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to confirm 2FA", 500));
  }
});

export const verify2FALogin = catchAsyncErrors(async (req, res, next) => {
  try {
    const { twoFaToken, code, backupCode } = req.body;

    if (!twoFaToken) {
      return next(new ErrorHandler("Missing 2FA token", 400));
    }
    if (!code && !backupCode) {
      return next(
        new ErrorHandler("2FA code or backup code is required", 400)
      );
    }

    let payload;
    try {
      payload = Jwt.verify(twoFaToken, process.env.JWT_SECRET);
    } catch (err) {
      return next(new ErrorHandler("Invalid or expired 2FA token", 401));
    }

    if (payload.stage !== "2fa") {
      return next(new ErrorHandler("Invalid 2FA token stage", 400));
    }

    const user = await User.findById(payload.id);
    if (!user) return next(new ErrorHandler("User not found", 404));
    if (!user.twoFactor?.enabled || !user.twoFactor.secret) {
      return next(new ErrorHandler("2FA not enabled for this user", 400));
    }

    // 🔐 decrypt TOTP secret
    const plainSecret = decryptTOTPSecret(user.twoFactor.secret);
    if (!plainSecret) {
      return next(new ErrorHandler("2FA secret is corrupted", 500));
    }

    let isValid = false;
    let usedBackup = false;

    // 1) TOTP path
    if (code) {
      isValid = authenticator.verify({
        token: code,
        secret: plainSecret,
      });
    }

    // 2) Backup code path
    if (!isValid && backupCode) {
      const hash = crypto
        .createHash("sha256")
        .update(backupCode)
        .digest("hex");

      const backup = user.twoFactor.backupCodes?.find(
        (b) => b.codeHash === hash && !b.used
      );

      if (backup) {
        isValid = true;
        usedBackup = true;
        backup.used = true;
        backup.usedAt = new Date();
      }
    }

    if (!isValid) {
      return next(new ErrorHandler("Invalid 2FA code or backup code", 400));
    }

    user.twoFactor.lastVerified = new Date();
    await user.save({ validateBeforeSave: false });

    // 🔹 After successful 2FA, register device + geo location
    await registerDeviceWithLocation({
      user,
      deviceId: payload.deviceId || "Unknown",
      // We don't have deviceName/model/brand in the 2FA request body,
      // so we keep existing values or just store deviceId + location.
      deviceName: undefined,
      deviceModel: undefined,
      deviceBrand: undefined,
      req,
    });

    const tokens = await sendTokens(res, user, payload.deviceId || "Unknown");

    return res.status(200).json({
      success: true,
      usedBackupCode: usedBackup,
      ...tokens,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to verify 2FA", 500));
  }
});

export const disable2FA = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { password, code, backupCode } = req.body;

    const user = await User.findById(userId).select("+password");
    if (!user) return next(new ErrorHandler("User not found", 404));

    if (!user.twoFactor?.enabled) {
      return next(new ErrorHandler("Two-factor authentication is not enabled", 400));
    }

    // 1) Confirm password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorHandler("Incorrect password", 401));
    }

    let verified = false;

    // 2) Option A: verify with current 2FA code
    if (code) {
      const plainSecret = decryptTOTPSecret(user.twoFactor.secret);
      if (!plainSecret) {
        return next(new ErrorHandler("2FA secret is corrupted", 500));
      }
      verified = authenticator.verify({ token: code, secret: plainSecret });
    }

    // 3) Option B: backup code
    if (!verified && backupCode) {
      const hash = crypto.createHash("sha256").update(backupCode).digest("hex");
      const backup = user.twoFactor.backupCodes?.find(
        (b) => b.codeHash === hash && !b.used
      );
      if (backup) {
        verified = true;
        backup.used = true;
        backup.usedAt = new Date();
      }
    }

    if (!verified) {
      return next(new ErrorHandler("Invalid 2FA code or backup code", 400));
    }

    // 4) Disable 2FA and clear secrets/codes
    user.twoFactor.enabled = false;
    user.twoFactor.secret = undefined;
    user.twoFactor.backupCodes = [];
    user.twoFactor.lastVerified = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Two-factor authentication has been disabled",
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to disable 2FA", 500));
  }
});

// List devices
export const getDevices = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("deviceInfo");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    return res.status(200).json({
      success: true,
      devices: user.deviceInfo || [],
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch devices", 500));
  }
});

// Logout specific device
export const logoutDevice = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { deviceId } = req.body;

    if (!deviceId) {
      return next(new ErrorHandler("Device ID is required", 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const prevCount = user.refreshTokens.length;

    // Remove all refresh tokens for that device
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.deviceId !== deviceId
    );

    // Optionally also remove deviceInfo entry
    user.deviceInfo = user.deviceInfo.filter(
      (d) => d.deviceId !== deviceId
    );

    const removedCount = prevCount - user.refreshTokens.length;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message:
        removedCount > 0
          ? "Device logged out successfully."
          : "No active sessions for this device (already logged out).",
      removedSessions: removedCount,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to logout device", 500));
  }
});