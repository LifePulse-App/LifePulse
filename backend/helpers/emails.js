import { Resend } from "resend";

// ⚠️ FIX: You must use a publicly hosted image URL. Email clients block Base64 Data URLs.
const LOGO_URL = "https://streaksphere.app/logo.png"; 
const EMAIL_FROM = process.env.EMAIL_FROM || "StreakSphere Support <no-reply@streaksphere.app>";

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY missing");
  }
  return new Resend(process.env.RESEND_API_KEY);
};

const sendHtml = ({ to, subject, html }) => {
  const resend = getResend();
  return resend.emails.send({ from: EMAIL_FROM, to, subject, html });
};

export const sendWelcomeEmail = ({ to, username }) =>
  sendHtml({
    to,
    subject: "Welcome to StreakSphere",
    html: welcomeEmailHtml({ username, email: to })
  });

export const sendOtpVerificationEmail = ({ to, username, otp }) =>
  sendHtml({
    to,
    subject: "Your StreakSphere verification code",
    html: otpEmailHtml({ username, email: to, otp })
  });

export const sendPasswordResetEmail = ({ to, username, code }) =>
  sendHtml({
    to,
    subject: "Reset your StreakSphere password",
    html: resetPasswordEmailHtml({ username, email: to, code })
  });

export const sendLoginAlertEmail = ({ to, username, deviceInfo, location, ip, time }) =>
  sendHtml({
    to,
    subject: "New login alert - StreakSphere",
    html: loginAlertEmailHtml({ username, email: to, deviceInfo, location, ip, time })
  });

/* ─── Premium Email Layout ────────────────────────────────────────────── */

const baseLayout = ({ title, preview, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background-color: #03040A !important; /* Pitch black/dark blue background */
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #E2E8F0;
    }

    .email-wrapper {
      background-color: #03040A;
      padding: 40px 16px;
      width: 100%;
    }

    .email-container {
      width: 100%;
      max-width: 480px; /* Perfect mobile width */
      margin: 0 auto;
    }

    /* Premium Card */
    .card {
      background-color: #0D111C;
      border-radius: 20px;
      border: 1px solid rgba(139, 92, 246, 0.15); /* Subtle purple border */
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    /* Glow accent at top */
    .card::before {
      content: '';
      display: block;
      height: 4px;
      background: linear-gradient(90deg, #6366F1, #A855F7, #EC4899);
    }

    /* Logo section */
    .logo-section {
      padding: 32px 32px 0;
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-img {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: block;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .logo-sub {
      font-size: 13px;
      color: #64748B;
      margin: 2px 0 0;
    }

    /* Body section */
    .body-section {
      padding: 28px 32px 32px;
    }

    /* Footer */
    .email-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #475569;
    }

    /* Mobile Adjustments */
    @media (max-width: 480px) {
      .email-wrapper { padding: 20px 10px; }
      .logo-section { padding: 24px 24px 0; }
      .body-section { padding: 24px; }
    }
  </style>
</head>
<body>
  <div style="display:none;opacity:0;height:0;width:0;font-size:0;color:#03040A;line-height:0;overflow:hidden;">
    ${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <div class="email-wrapper">
    <div class="email-container">
      <div class="card">
        <div class="logo-section">
          <img src="${LOGO_URL}" alt="StreakSphere" class="logo-img" fallback="⚡" />
          <div>
            <h2 class="logo-text">StreakSphere</h2>
          </div>
        </div>

        <div class="body-section">
          ${bodyHtml}
        </div>
      </div>
      <div class="email-footer">Securely sent by StreakSphere Support</div>
    </div>
  </div>
</body>
</html>
`;

/* ─── Reusable Inline Styles ────────────────────────────────────────────── */

const s = {
  h1: `margin:0 0 8px 0;font-size:24px;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;line-height:1.3;`,
  p: `margin:0 0 16px 0;font-size:15px;color:#94A3B8;line-height:1.6;`,
  
  badge: (bg, color) =>
    `display:inline-block;background-color:${bg};border:1px solid ${color}40;border-radius:100px;padding:6px 14px;font-size:13px;font-weight:600;color:${color};margin-bottom:20px;`,

  codeBox: `background-color:#03040A;border:1px solid rgba(168,85,247,0.3);border-radius:16px;padding:24px;text-align:center;margin:24px 0;`,
  codeDigits: `font-size:36px;letter-spacing:0.25em;font-weight:800;color:#FFFFFF;margin:0;padding:0;`,
  codeTimer: `font-size:13px;color:#64748B;margin-top:12px;font-weight:500;`,

  infoBox: `background-color:#03040A;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:24px;`,
  infoRow: `display:flex;align-items:center;margin-bottom:12px;`,
  infoLabel: `font-size:13px;color:#64748B;width:80px;margin:0;`,
  infoValue: `font-size:14px;font-weight:600;color:#E2E8F0;margin:0;`,

  safeBox: `background-color:rgba(255,255,255,0.03);border-radius:12px;padding:16px;font-size:13px;color:#94A3B8;line-height:1.5;margin-top:24px;border-left:3px solid #6366F1;`,
  alertBox: `background-color:rgba(239,68,68,0.05);border-radius:12px;padding:16px;font-size:13px;color:#FCA5A5;line-height:1.5;margin-top:24px;border-left:3px solid #EF4444;`,
};

/* ─── Templates ───────────────────────────────────────────────────────── */

export const welcomeEmailHtml = ({ username, email }) =>
  baseLayout({
    title: "Welcome to StreakSphere",
    preview: "Your account is ready — let's build some streaks 🔥",
    bodyHtml: `
      <div style="${s.badge('rgba(16,185,129,0.1)', '#10B981')}">✦ Account Activated</div>
      <h1 style="${s.h1}">Welcome, ${username || email} 👋</h1>
      <p style="${s.p}">Your StreakSphere account is officially live. Start tracking habits, building streaks, and staying consistent — one day at a time.</p>
      <div style="${s.safeBox}">🛡️ Didn't sign up? You can safely ignore this email — your account requires email confirmation to activate.</div>
    `
  });

export const otpEmailHtml = ({ username, email, otp }) =>
  baseLayout({
    title: "Your verification code — StreakSphere",
    preview: `Your one-time code is ${otp}`,
    bodyHtml: `
      <div style="${s.badge('rgba(168,85,247,0.1)', '#A855F7')}">🔐 Verification</div>
      <h1 style="${s.h1}">Verify your email</h1>
      <p style="${s.p}">Hi ${username || email}, enter the secure code below to verify your account:</p>
      <div style="${s.codeBox}">
        <div style="${s.codeDigits}">${otp}</div>
        <div style="${s.codeTimer}">⏱️ Expires in 2 minutes</div>
      </div>
      <div style="${s.safeBox}">🔒 Never share this code with anyone. StreakSphere will never ask for it.</div>
    `
  });

export const resetPasswordEmailHtml = ({ username, email, code }) =>
  baseLayout({
    title: "Reset your password — StreakSphere",
    preview: `Your password reset code is ready`,
    bodyHtml: `
      <div style="${s.badge('rgba(245,158,11,0.1)', '#F59E0B')}">🔑 Password Reset</div>
      <h1 style="${s.h1}">Reset your password</h1>
      <p style="${s.p}">Hi ${username || email}, use the secure code below to set a new password:</p>
      <div style="${s.codeBox}">
        <div style="${s.codeDigits}">${code}</div>
        <div style="${s.codeTimer}">⏱️ Expires in 2 minutes</div>
      </div>
      <div style="${s.safeBox}">⚠️ Didn't request this? Your account is still secure. You can safely ignore this email.</div>
    `
  });

export const loginAlertEmailHtml = ({ username, email, deviceInfo, location, ip, time }) =>
  baseLayout({
    title: "New login to your account — StreakSphere",
    preview: "A new sign-in was detected on your account",
    bodyHtml: `
      <div style="${s.badge('rgba(239,68,68,0.1)', '#EF4444')}">🔔 Security Alert</div>
      <h1 style="${s.h1}">New login detected</h1>
      <p style="${s.p}">Hi ${username || email}, a sign-in to your account was just recorded.</p>
      
      <div style="${s.infoBox}">
        <div style="${s.infoRow}"><p style="${s.infoLabel}">Device</p><p style="${s.infoValue}">${deviceInfo?.deviceName || 'Unknown'} ${deviceInfo?.deviceModel || ''}</p></div>
        <div style="${s.infoRow}"><p style="${s.infoLabel}">IP Address</p><p style="${s.infoValue}">${ip || 'Unknown'}</p></div>
        <div style="${s.infoRow}"><p style="${s.infoLabel}">Location</p><p style="${s.infoValue}">${location || 'Unknown'}</p></div>
        <div style="${s.infoRow}"><p style="${s.infoLabel}">Time</p><p style="${s.infoValue}">${time || 'Unknown'}</p></div>
      </div>

      <div style="${s.alertBox}">🚨 <strong>Not you?</strong> Reset your password immediately and revoke all active sessions from your security settings.</div>
    `
  });