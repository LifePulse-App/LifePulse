import User from "../models/UserSchema.js";
import crypto from "crypto";
import validator from "validator";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendVerificationEmail } from "./OtpController.js";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

// Helper: extract avatarId from a models.readyplayer.me GLB URL
const extractAvatarId = (url) => {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('models.readyplayer.me')) return null;
    const parts = u.pathname.split('/');
    const last = parts[parts.length - 1]; // e.g. "693...ead.glb"
    const id = last.replace('.glb', '').replace('.json', '').replace('.png', '').replace('.jpg', '');
    return id || null;
  } catch {
    return null;
  }
};

// Helper: build 2D render url for PNG
const buildAvatarThumbnailUrl = (modelUrl) => {
  const avatarId = extractAvatarId(modelUrl);
  if (!avatarId) return '';
  // Tune params as you like
  const size = 1024;
  const camera = 'portrait'; // 'portrait' | 'fullbody' | 'fit'
  const expression = 'happy'; // 'happy' | 'lol' | ...
  const pose = 'relaxed';     // 'power-stance' | 'thumbs-up' | ...

  return `https://models.readyplayer.me/${avatarId}.png?size=${size}&camera=${camera}`;
};

// Get profile
export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select("-password -resetPasswordCode -resetPasswordCodeExpire -verificationCode -verificationCodeExpire");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({ success: true, user });
});

// Edit profile (NO email update!)
export const editProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, username, avatar, currentTitle, isPublic } = req.body;

  const update = {};

  if (name) update.name = name;

  if (username) {
    const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
    if (exists) return next(new ErrorHandler("Username already exists", 400));
    update.username = username;
  }

  if (avatar) update.avatar = avatar;
  if (currentTitle) update.currentTitle = currentTitle;

  // ✅ NEW: allow toggling location visibility / public profile flag
  // isPublic === true  -> show location publicly
  // isPublic === false -> friends only
  if (typeof isPublic === "boolean") {
    update.isPublic = isPublic;
  } else if (isPublic === "true" || isPublic === "false") {
    // if coming from form-data / string
    update.isPublic = isPublic === "true";
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
  res.status(200).json({ success: true, user });
});

// Request password change OTP
export const requestPasswordChangeOtp = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");

  user.passwordChangeOtp = hashed;
  user.passwordChangeOtpExpire = Date.now() + 2 * 60 * 1000; // 15 minutes

  await sendVerificationEmail(user.email, otp);
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP sent to your registered email address."
  });
});

// Change password WITH OTP verification
export const changePasswordWithOtp = catchAsyncErrors(async (req, res, next) => {
  const { oldPassword, newPassword, otp } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) return next(new ErrorHandler("User not found", 404));
  if (!otp) return next(new ErrorHandler("OTP required", 400));
  if (!user.passwordChangeOtp || !user.passwordChangeOtpExpire) {
    return next(new ErrorHandler("No valid OTP found. Request a new OTP.", 400));
  }
  if (user.passwordChangeOtpExpire < Date.now()) {
    user.passwordChangeOtp = undefined;
    user.passwordChangeOtpExpire = undefined;
    await user.save();
    return next(new ErrorHandler("OTP expired. Request again.", 400));
  }
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) return next(new ErrorHandler("Old password incorrect", 400));
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashed !== user.passwordChangeOtp) {
    return next(new ErrorHandler("Incorrect OTP", 400));
  }
  user.password = newPassword;
  user.passwordChangeOtp = undefined;
  user.passwordChangeOtpExpire = undefined;
  await user.save();
  res.status(200).json({ success: true, message: "Password changed successfully" });
});

// Change number
export const changeNumber = catchAsyncErrors(async (req, res, next) => {
  const { phone } = req.body;
  if (!phone) return next(new ErrorHandler("Phone required", 400));
  const exists = await User.findOne({ phone, _id: { $ne: req.user._id } });
  if (exists) return next(new ErrorHandler("Phone number already exists", 400));
  const user = await User.findByIdAndUpdate(req.user._id, { phone }, { new: true }).select("-password");
  res.status(200).json({ success: true, user });
});

// Linked accounts: show registered email (no providers)
export const getLinkedAccounts = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({ success: true, email: user.email });
});

export const requestEmailChange = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newEmail } = req.body;
  if (!newEmail || !validator.isEmail(newEmail)) {
    return next(new ErrorHandler("Invalid email address", 400));
  }
  const exists = await User.findOne({ email: newEmail });
  if (exists) return next(new ErrorHandler("Email already exists", 400));

  // Find user
  const user = await User.findById(req.user._id).select("+password");
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Verify password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(new ErrorHandler("Password incorrect", 400));

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  user.emailChangeOtp = hashed;
  user.emailChangeOtpExpire = Date.now() + 2 * 60 * 1000; // 2 minutes
  user.pendingEmail = newEmail;

  await sendVerificationEmail(newEmail, otp);
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP sent to your new email address."
  });
});

// Verify OTP and actually change email
export const verifyEmailChange = catchAsyncErrors(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return next(new ErrorHandler("OTP required", 400));
  const user = await User.findById(req.user._id);

  if (!user.pendingEmail || !user.emailChangeOtp || !user.emailChangeOtpExpire) {
    return next(new ErrorHandler("No pending email change request found.", 400));
  }
  if (user.emailChangeOtpExpire < Date.now()) {
    user.emailChangeOtp = undefined;
    user.emailChangeOtpExpire = undefined;
    user.pendingEmail = undefined;
    await user.save();
    return next(new ErrorHandler("OTP expired. Request again.", 400));
  }
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashed !== user.emailChangeOtp) {
    return next(new ErrorHandler("Incorrect OTP", 400));
  }
  user.email = user.pendingEmail;
  user.emailChangeOtp = undefined;
  user.emailChangeOtpExpire = undefined;
  user.pendingEmail = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email successfully changed.",
    email: user.email
  });
});

// (Optional) manageLinkedAccounts can just call getLinkedAccounts (kept for route compatibility)
export const manageLinkedAccounts = getLinkedAccounts;

// Update avatar/Bitmoji
export const updateAvatarOrBitmoji = catchAsyncErrors(async (req, res, next) => {
  const { avatar, bitmoji } = req.body;
  const update = {};
  if (avatar) update.avatar = avatar;
  if (bitmoji) update.bitmoji = bitmoji;
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
  res.status(200).json({ success: true, user });
});

// Update notifications
export const updateNotifications = catchAsyncErrors(async (req, res, next) => {
  const { pushEnabled, pauseStreak, pauseChat, pauseJabits } = req.body;
  const user = await User.findById(req.user._id);

  if (typeof pushEnabled === "boolean") user.notifications.push = pushEnabled;
  if (typeof pauseStreak === "boolean") user.notifications.pauseStreak = pauseStreak;
  if (typeof pauseChat === "boolean") user.notifications.pauseChat = pauseChat;
  if (typeof pauseJabits === "boolean") user.notifications.pauseJabits = pauseJabits;
  await user.save();

  res.status(200).json({ success: true, notifications: user.notifications });
});

// Update app settings
export const updateAppSettings = catchAsyncErrors(async (req, res, next) => {
  const { language, region, dataSaver, advanced } = req.body;
  const user = await User.findById(req.user._id);
  if (language) user.appSettings.language = language;
  if (region) user.appSettings.region = region;
  if (typeof dataSaver === "boolean") user.appSettings.dataSaver = dataSaver;
  if (advanced) user.appSettings.advanced = advanced;
  await user.save();
  res.status(200).json({ success: true, appSettings: user.appSettings });
});

// Delete account
export const deleteAccount = catchAsyncErrors(async (req, res, next) => {
  await User.findByIdAndDelete(req.user._id);
  res.status(200).json({ success: true, message: "Account deleted" });
});

// Get login activity (recent devices)
export const getLoginActivity = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({
    success: true,
    devices: user.deviceInfo.map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceModel: d.deviceModel,
      deviceBrand: d.deviceBrand,
      lastLogin: d.lastLogin,
    }))
  });
});

// GET /api/me/avatar
export const getAvatarConfig = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('avatarConfig');
  if (!user) return next(new ErrorHandler('User not found', 404));

  res.status(200).json({
    success: true,
    avatarConfig: user.avatarConfig || null,
  });
});

// POST /api/me/avatar
export const updateAvatarConfig = catchAsyncErrors(async (req, res, next) => {
  const allowedFields = [
    'skinTone',
    'hairStyle',
    'hairColor',
    'eyeShape',
    'eyeColor',
    'mouth',
    'eyebrowStyle',
    'accessories',
    'outfit',
    'backgroundColor',
  ];

  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[`avatarConfig.${key}`] = req.body[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: false },
  ).select('avatarConfig');

  if (!user) return next(new ErrorHandler('User not found', 404));

  res.status(200).json({
    success: true,
    avatarConfig: user.avatarConfig,
  });
});

// GET /api/me/avatar-url
export const getAvatarUrl = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id).select(
    'avatarModelUrl avatarThumbnailUrl avatarMetadata',
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  res.status(200).json({
    success: true,
    avatarModelUrl: user.avatarModelUrl || '',
    avatarThumbnailUrl: user.avatarThumbnailUrl || '',
    avatarMetadata: user.avatarMetadata || {},
  });
});

// POST /api/me/avatar-url
export const updateAvatarUrl = catchAsyncErrors(async (req, res, next) => {
  const { avatarUrl, avatarMetadata } = req.body;
  if (!avatarUrl) {
    return next(new ErrorHandler('avatarUrl is required', 400));
  }

  const thumbnailUrl = buildAvatarThumbnailUrl(avatarUrl);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatarModelUrl: avatarUrl,
        avatarThumbnailUrl: thumbnailUrl,
        ...(avatarMetadata ? { avatarMetadata } : {}),
      },
    },
    { new: true, runValidators: false },
  ).select('avatarModelUrl avatarThumbnailUrl avatarMetadata');

  if (!user) return next(new ErrorHandler('User not found', 404));

  res.status(200).json({
    success: true,
    avatarModelUrl: user.avatarModelUrl,
    avatarThumbnailUrl: user.avatarThumbnailUrl,
    avatarMetadata: user.avatarMetadata,
  });
});

// POST /api/me/location
export const updateLocation = catchAsyncErrors(async (req, res, next) => {
  const { country, city } = req.body;
  if (!country) {
    return next(new ErrorHandler('Country is required', 400));
  }

  const user = await User.findById(req.user._id).select('country city locationLockUntil');
  if (!user) return next(new ErrorHandler('User not found', 404));

  const now = new Date();
  if (user.locationLockUntil && user.locationLockUntil > now) {
    const daysLeft = Math.ceil((user.locationLockUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return next(new ErrorHandler(`You can change your location again in ${daysLeft} day(s).`, 403));
  }

  user.country = country;
  user.city = city || '';
  user.locationLockUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await user.save();

  res.status(200).json({
    success: true,
    country: user.country,
    city: user.city,
    locationLockUntil: user.locationLockUntil,
  });
});

// controllers/locationController.js (add this alongside updateLocation)
export const getLocationLockStatus = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('locationLockUntil country city');
  if (!user) return next(new ErrorHandler('User not found', 404));

  const now = new Date();
  const lockUntil = user.locationLockUntil;
  let locked = false;
  let daysLeft = 0;

  if (lockUntil && lockUntil > now) {
    locked = true;
    daysLeft = Math.ceil((lockUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  res.status(200).json({
    success: true,
    locked,
    daysLeft,
    locationLockUntil: lockUntil,
    country: user.country,
    city: user.city,
  });
});

// 1. Prepare the directory for file uploads
const AVATAR_DIR = path.join(os.homedir(), "uploads", "avatars");

// auto-create folder if missing
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, req.user._id + "_" + Date.now() + ext);
  },
});

export const upload = multer({ storage });

// 3. Controller: Upload avatar and save path to user
export const uploadAvatar = catchAsyncErrors(async (req, res, next) => {
  if (!req.file) return next(new ErrorHandler("No file uploaded", 400));
  
  console.log(req.file);
  const avatarUrl = `/avatars/${req.file.filename}`;
  console.log(avatarUrl);
  // Optionally delete previous avatar here (recommended for cleanup!)
  await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl },
    { new: true }
  );
  res.json({ success: true, url: avatarUrl });
});

// 4. Controller: Get current avatar of a user (by auth)
export const getMyAvatar = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("avatarUrl");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.json({ success: true, avatarUrl: user.avatarUrl });
});

// controllers/avatarController.js
export const getUserProfile = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("name username avatarUrl");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.json({ success: true, user });
});

// DELETE avatar for current user
export const deleteAvatar = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("avatarUrl");
  if (!user) return next(new ErrorHandler("User not found", 404));

  // // Remove file from disk if there is an avatar
  // if (user.avatarUrl) {
  //   // Remove leading slash if present
  //   const filePath = user.avatarUrl.startsWith("/")
  //     ? user.avatarUrl.slice(1)
  //     : user.avatarUrl;

  //   // Full path (relative to your project root)
  //   const absoluteFilePath = path.join(process.cwd(), filePath);
  //   fs.unlink(absoluteFilePath, (err) => {
  //     // ignore error (file might not exist)
  //   });
  // }

  // Remove avatarUrl reference in db
  user.avatarUrl = undefined;
  await user.save();

  res.json({ success: true, message: "Avatar removed." });
});
