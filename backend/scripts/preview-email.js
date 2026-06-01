import fs from "fs";
import path from "path";
import {
  welcomeEmailHtml,
  otpEmailHtml,
  resetPasswordEmailHtml,
  loginAlertEmailHtml
} from "../helpers/emailTemplates.js";

const logoBase64 = process.env.EMAIL_LOGO_BASE64 || "";
const logoDataUrl = `data:image/png;base64,${logoBase64}`;

const previews = [
  {
    name: "welcome.html",
    html: welcomeEmailHtml({ username: "Ali", email: "ali@example.com", logoDataUrl })
  },
  {
    name: "otp.html",
    html: otpEmailHtml({ username: "Ali", email: "ali@example.com", otp: "123456", logoDataUrl })
  },
  {
    name: "reset.html",
    html: resetPasswordEmailHtml({ username: "Ali", email: "ali@example.com", code: "654321", logoDataUrl })
  },
  {
    name: "login-alert.html",
    html: loginAlertEmailHtml({
      username: "Ali",
      email: "ali@example.com",
      deviceInfo: { deviceName: "iPhone", deviceModel: "14 Pro", deviceBrand: "Apple" },
      location: "Lahore, PK",
      ip: "203.0.113.42",
      time: new Date().toISOString(),
      logoDataUrl
    })
  }
];

const outDir = path.join(process.cwd(), "backend", "email-previews");
fs.mkdirSync(outDir, { recursive: true });

previews.forEach(p => {
  fs.writeFileSync(path.join(outDir, p.name), p.html, "utf8");
  console.log("Generated:", path.join(outDir, p.name));
});