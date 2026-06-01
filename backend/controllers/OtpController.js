import User from "../models/UserSchema.js";

import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../helpers/emails.js"

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

export const sendVerificationEmail = async (to, otp, username) => {
  await sendOtpVerificationEmail({ to, username, otp });
};

export const sendResetPasswordEmail = async (to, code, username) => {
  await sendPasswordResetEmail({ to, username, code });
};
  
// verifyEmail.js
export const verifyEmail = catchAsyncErrors(async (req, res, next) => {
    const { email, otp, deviceId } = req.body;

    if (!email || !otp ) {
        return next(new ErrorHandler("Info Required", 400));
      }
  
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
  
    // compare entered OTP with saved one
    if (!(await user.verifyOtp(otp))) {
      return next(new ErrorHandler("Invalid or expired OTP", 400));
    }
  
    user.isVerified = true;
    user.verificationCode = undefined; // clear code
    user.verificationCodeExpire = undefined;
    await user.save();
  
    // now issue tokens only AFTER verification
    const tokens = await sendTokens(res, user, deviceId);
    await sendWelcomeEmail({ to: user.email, username: user.name || user.username || user.email });
  
    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      ...tokens,
    });
  });
  
  