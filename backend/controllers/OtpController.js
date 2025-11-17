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
      from: `StreakSphere Support`,
      to,
      subject: "Verify your email - StreakSphere",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Verify your email - StreakSphere</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          /* Some clients ignore <style>, so key styles are inline below as well */
          @media (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 16px !important;
            }
            .logo-text {
              font-size: 22px !important;
            }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#0f172a; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: radial-gradient(circle at top, #1d4ed8, #020617 55%); padding: 32px 0;">
          <tr>
            <td align="center">
              <table class="email-container" width="480" cellpadding="0" cellspacing="0" role="presentation" 
                style="width:480px; max-width: 100%; background-color:#020617; border-radius:18px; overflow:hidden; box-shadow:0 24px 60px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.35);">
                
                <!-- Header / Logo -->
                <tr>
                  <td style="padding: 20px 28px 12px 28px; background: linear-gradient(135deg, rgba(37,99,235,0.18), rgba(6,182,212,0.14)); border-bottom: 1px solid rgba(148,163,184,0.35);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style="vertical-align: middle;">
                          <!-- Simple logo circle -->
                          <div style="
                            width:36px; 
                            height:36px; 
                            border-radius:999px; 
                            background:radial-gradient(circle at 30% 20%, #e5e7eb, #38bdf8);
                            display:inline-flex;
                            align-items:center;
                            justify-content:center;
                            box-shadow:0 10px 30px rgba(37,99,235,0.65);
                            ">
                            <span style="font-size:18px; font-weight:700; color:#020617; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">S</span>
                          </div>
                          <span class="logo-text" style="margin-left:10px; font-size:20px; font-weight:600; color:#e5e7eb; letter-spacing:0.03em;">StreakSphere</span>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#9ca3af;">
                            Email Verification
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
  
                <!-- Main Content -->
                <tr>
                  <td style="padding: 24px 28px 8px 28px;">
                    <h1 style="margin:0 0 8px 0; font-size:24px; line-height:1.3; color:#e5e7eb; font-weight:600;">
                      Verify your email address
                    </h1>
                    <p style="margin:0 0 12px 0; font-size:14px; line-height:1.7; color:#9ca3af;">
                      Thanks for signing up for <span style="color:#e5e7eb; font-weight:500;">StreakSphere</span>. 
                      To keep your account secure and finish setting things up, please confirm that this email address belongs to you.
                    </p>
                    <p style="margin:0 0 16px 0; font-size:14px; line-height:1.7; color:#9ca3af;">
                      Use the verification code below to complete your registration:
                    </p>
  
                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 16px 0 12px 0;">
                      <tr>
                        <td align="center">
                          <div style="
                            display:inline-block;
                            padding:14px 28px;
                            border-radius:999px;
                            border:1px solid rgba(148,163,184,0.55);
                            background: radial-gradient(circle at 0 0, rgba(59,130,246,0.35), rgba(15,23,42,0.9));
                            box-shadow:0 18px 40px rgba(15,23,42,0.95);
                          ">
                            <span style="font-size:22px; letter-spacing:0.3em; color:#f9fafb; font-weight:700; font-family:'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                              ${otp}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
  
                    <p style="margin:4px 0 16px 0; font-size:12px; line-height:1.6; color:#9ca3af;">
                      This code will expire in <span style="color:#f97316; font-weight:500;">5 minutes</span>. 
                      For your security, please don’t share this code with anyone.
                    </p>
  
                    <!-- Divider -->
                    <div style="margin:16px 0; height:1px; background:linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent);"></div>
  
                    <p style="margin:0 0 4px 0; font-size:13px; line-height:1.7; color:#9ca3af;">
                      Didn’t request this?
                    </p>
                    <p style="margin:0 0 16px 0; font-size:12px; line-height:1.7; color:#6b7280;">
                      If you didn’t create a StreakSphere account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
  
                <!-- Footer -->
                <tr>
                  <td style="padding: 10px 28px 20px 28px; background: radial-gradient(circle at bottom, rgba(15,118,110,0.35), transparent);">
                    <p style="margin:0 0 4px 0; font-size:11px; line-height:1.6; color:#6b7280;">
                      Sent by <span style="color:#e5e7eb; font-weight:500;">StreakSphere Support</span>
                    </p>
                    <p style="margin:0; font-size:11px; line-height:1.6; color:#4b5563;">
                      If you need help, contact us at 
                      <a href="mailto:${process.env.EMAIL_USER}" style="color:#60a5fa; text-decoration:none;">
                      </a>.
                    </p>
                  </td>
                </tr>
  
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
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
  
  