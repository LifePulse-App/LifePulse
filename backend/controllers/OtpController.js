import User from "../models/UserSchema.js";
import { transporter } from "../server.js";

import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";

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

export const sendVerificationEmail = async (to, otp) => {
    const mailOptions = {
      from: `"LifePulse Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Verification Code",
      html: `<h2>Verification Code</h2>
             <p>Your OTP code is: <b>${otp}</b></p>
             <p>It will expire in 5 minutes.</p>`,
    };
  
    await transporter.sendMail(mailOptions);
  };


  export const sendResetPasswordEmail = async (to, resetUrl) => {
    const mailOptions = {
      from: `"LifePulse Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset it (valid for 15 minutes):</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          margin-top: 10px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };
  
    await transporter.sendMail(mailOptions);
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
  
    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      ...tokens,
    });
  });
  
  