import User from "../models/UserSchema.js";
import crypto from "crypto";
import validator from "validator";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendVerificationEmail } from "./OtpController.js";

// Get profile
export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select("-password -resetPasswordCode -resetPasswordCodeExpire -verificationCode -verificationCodeExpire");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({ success: true, user });
});

// Edit profile (NO email update!)
export const editProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, username, avatar, currentTitle } = req.body;
  const update = {};
  if (name) update.name = name;
  if (username) {
    const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
    if (exists) return next(new ErrorHandler("Username already exists", 400));
    update.username = username;
  }
  if (avatar) update.avatar = avatar;
  if (currentTitle) update.currentTitle = currentTitle;

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