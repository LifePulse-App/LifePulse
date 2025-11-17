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
      from: `"StreakSphere Support" <${process.env.EMAIL_USER}>`,
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
          /* Some clients ignore <style>, but mobile clients like iOS Mail/Gmail do use it */
          @media (max-width: 600px) {
            .email-container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
              border-radius: 14px !important;
            }
            .inner-padding {
              padding: 18px 18px 8px 18px !important;
            }
            .header-padding {
              padding: 16px 18px 10px 18px !important;
            }
            .footer-padding {
              padding: 8px 18px 16px 18px !important;
            }
            .logo-text {
              font-size: 18px !important;
            }
            .main-title {
              font-size: 20px !important;
            }
            .subtitle-text {
              font-size: 13px !important;
            }
            .otp-text {
              font-size: 20px !important;
              letter-spacing: 0.18em !important;
            }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#020617; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" 
          style="background-color:#020617; padding:24px 0; margin:0;">
          <tr>
            <td align="center" style="padding:0 12px;">
              <table class="email-container" width="480" cellpadding="0" cellspacing="0" role="presentation"
                style="
                  width:100%;
                  max-width:480px;
                  background-color:#020617;
                  border-radius:18px;
                  overflow:hidden;
                  box-shadow:0 24px 60px rgba(15,23,42,0.9);
                  border:1px solid rgba(148,163,184,0.35);
                ">
                
                <!-- Header / Logo -->
                <tr>
                  <td class="header-padding" style="padding: 20px 24px 12px 24px; background: linear-gradient(135deg, rgba(37,99,235,0.18), rgba(6,182,212,0.14)); border-bottom: 1px solid rgba(148,163,184,0.35);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style="vertical-align: middle;">
                          <div style="
                            width:34px;
                            height:34px;
                            border-radius:999px;
                            background:radial-gradient(circle at 30% 20%, #e5e7eb, #38bdf8);
                            display:inline-flex;
                            align-items:center;
                            justify-content:center;
                            box-shadow:0 10px 30px rgba(37,99,235,0.65);
                          ">
                            <span style="font-size:18px; font-weight:700; color:#020617; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">S</span>
                          </div>
                          <span class="logo-text" style="margin-left:10px; font-size:20px; font-weight:600; color:#e5e7eb; letter-spacing:0.03em;">
                            StreakSphere
                          </span>
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
                  <td class="inner-padding" style="padding: 22px 24px 10px 24px;">
                    <h1 class="main-title" style="margin:0 0 8px 0; font-size:22px; line-height:1.3; color:#e5e7eb; font-weight:600;">
                      Verify your email address
                    </h1>
                    <p class="subtitle-text" style="margin:0 0 10px 0; font-size:14px; line-height:1.6; color:#9ca3af;">
                      Thanks for signing up for <span style="color:#e5e7eb; font-weight:500;">StreakSphere</span>. 
                      To keep your account secure and finish setting things up, please confirm that this email address belongs to you.
                    </p>
                    <p style="margin:0 0 14px 0; font-size:14px; line-height:1.6; color:#9ca3af;">
                      Use the verification code below to complete your registration:
                    </p>
  
                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 10px 0 10px 0;">
                      <tr>
                        <td align="center">
                          <div style="
                            display:inline-block;
                            padding:12px 24px;
                            border-radius:999px;
                            border:1px solid rgba(148,163,184,0.55);
                            background: radial-gradient(circle at 0 0, rgba(59,130,246,0.35), rgba(15,23,42,0.9));
                            box-shadow:0 18px 40px rgba(15,23,42,0.95);
                            max-width:100%;
                          ">
                            <span class="otp-text" style="font-size:22px; letter-spacing:0.25em; color:#f9fafb; font-weight:700; font-family:'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                              ${otp}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
  
                    <p style="margin:4px 0 14px 0; font-size:12px; line-height:1.6; color:#9ca3af;">
                      This code will expire in <span style="color:#f97316; font-weight:500;">2 minutes</span>. 
                      For your security, please don’t share this code with anyone.
                    </p>
  
                    <!-- Divider -->
                    <div style="margin:14px 0; height:1px; background:linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent);"></div>
  
                    <p style="margin:0 0 4px 0; font-size:13px; line-height:1.6; color:#9ca3af;">
                      Didn’t request this?
                    </p>
                    <p style="margin:0 0 14px 0; font-size:12px; line-height:1.6; color:#6b7280;">
                      If you didn’t create a StreakSphere account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
  
                <!-- Footer -->
                <tr>
                  <td class="footer-padding" style="padding: 10px 24px 18px 24px; background: radial-gradient(circle at bottom, rgba(15,118,110,0.35), transparent);">
                    <p style="margin:0 0 4px 0; font-size:11px; line-height:1.6; color:#6b7280;">
                      Sent by <span style="color:#e5e7eb; font-weight:500;">StreakSphere Support</span>
                    </p>
                    <p style="margin:0; font-size:11px; line-height:1.6; color:#4b5563;">
                      If you need help, contact us at 
                      <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}" style="color:#60a5fa; text-decoration:none;">
                        ${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}
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


  export const sendResetPasswordEmail = async (to, code) => {
    const mailOptions = {
      from: `"StreakSphere Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reset your password - StreakSphere",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Reset your password - StreakSphere</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @media (max-width: 600px) {
            .email-container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
              border-radius: 14px !important;
            }
            .inner-padding {
              padding: 18px 18px 8px 18px !important;
            }
            .header-padding {
              padding: 16px 18px 10px 18px !important;
            }
            .footer-padding {
              padding: 8px 18px 16px 18px !important;
            }
            .logo-text {
              font-size: 18px !important;
            }
            .main-title {
              font-size: 20px !important;
            }
            .subtitle-text {
              font-size: 13px !important;
            }
            .otp-text {
              font-size: 20px !important;
              letter-spacing: 0.18em !important;
            }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#020617; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" 
          style="background-color:#020617; padding:24px 0; margin:0;">
          <tr>
            <td align="center" style="padding:0 12px;">
              <table class="email-container" width="480" cellpadding="0" cellspacing="0" role="presentation"
                style="
                  width:100%;
                  max-width:480px;
                  background-color:#020617;
                  border-radius:18px;
                  overflow:hidden;
                  box-shadow:0 24px 60px rgba(15,23,42,0.9);
                  border:1px solid rgba(148,163,184,0.35);
                ">
                
                <!-- Header / Logo -->
                <tr>
                  <td class="header-padding" style="padding: 20px 24px 12px 24px; background: linear-gradient(135deg, rgba(37,99,235,0.18), rgba(6,182,212,0.14)); border-bottom: 1px solid rgba(148,163,184,0.35);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style="vertical-align: middle;">
                          <div style="
                            width:34px;
                            height:34px;
                            border-radius:999px;
                            background:radial-gradient(circle at 30% 20%, #e5e7eb, #38bdf8);
                            display:inline-flex;
                            align-items:center;
                            justify-content:center;
                            box-shadow:0 10px 30px rgba(37,99,235,0.65);
                          ">
                            <span style="font-size:18px; font-weight:700; color:#020617; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">S</span>
                          </div>
                          <span class="logo-text" style="margin-left:10px; font-size:20px; font-weight:600; color:#e5e7eb; letter-spacing:0.03em;">
                            StreakSphere
                          </span>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#9ca3af;">
                            Password Reset
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
  
                <!-- Main Content -->
                <tr>
                  <td class="inner-padding" style="padding: 22px 24px 10px 24px;">
                    <h1 class="main-title" style="margin:0 0 8px 0; font-size:22px; line-height:1.3; color:#e5e7eb; font-weight:600;">
                      Reset your password
                    </h1>
                    <p class="subtitle-text" style="margin:0 0 10px 0; font-size:14px; line-height:1.6; color:#9ca3af;">
                      We received a request to reset the password for your 
                      <span style="color:#e5e7eb; font-weight:500;">StreakSphere</span> account.
                    </p>
                    <p style="margin:0 0 14px 0; font-size:14px; line-height:1.6; color:#9ca3af;">
                      Use the verification code below to set a new password:
                    </p>
  
                    <!-- Reset Code Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 10px 0 10px 0;">
                      <tr>
                        <td align="center">
                          <div style="
                            display:inline-block;
                            padding:12px 24px;
                            border-radius:999px;
                            border:1px solid rgba(148,163,184,0.55);
                            background: radial-gradient(circle at 0 0, rgba(59,130,246,0.35), rgba(15,23,42,0.9));
                            box-shadow:0 18px 40px rgba(15,23,42,0.95);
                            max-width:100%;
                          ">
                            <span class="otp-text" style="font-size:22px; letter-spacing:0.25em; color:#f9fafb; font-weight:700; font-family:'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                              ${code}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
  
                    <p style="margin:4px 0 14px 0; font-size:12px; line-height:1.6; color:#9ca3af;">
                      This code will expire in <span style="color:#f97316; font-weight:500;">2 minutes</span>. 
                      For your security, please don’t share this code with anyone.
                    </p>
  
                    <!-- Divider -->
                    <div style="margin:14px 0; height:1px; background:linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent);"></div>
  
                    <p style="margin:0 0 4px 0; font-size:13px; line-height:1.6; color:#9ca3af;">
                      Didn’t request a password reset?
                    </p>
                    <p style="margin:0 0 14px 0; font-size:12px; line-height:1.6; color:#6b7280;">
                      If you didn’t request this, you can safely ignore this email and your password will stay the same.
                    </p>
                  </td>
                </tr>
  
                <!-- Footer -->
                <tr>
                  <td class="footer-padding" style="padding: 10px 24px 18px 24px; background: radial-gradient(circle at bottom, rgba(15,118,110,0.35), transparent);">
                    <p style="margin:0 0 4px 0; font-size:11px; line-height:1.6; color:#6b7280;">
                      Sent by <span style="color:#e5e7eb; font-weight:500;">StreakSphere Support</span>
                    </p>
                    <p style="margin:0; font-size:11px; line-height:1.6; color:#4b5563;">
                      If you need help, contact us at 
                      <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}" style="color:#60a5fa; text-decoration:none;">
                        ${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}
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
  
  