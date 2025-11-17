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

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}_\-+=<>.,;:|/\\])[A-Za-z\d@$!%*?&#^()[\]{}_\-+=<>.,;:|/\\]{8,}$/;

    if (!passwordRegex.test(password)) {
      return next(
        new ErrorHandler(
          "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character.",
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