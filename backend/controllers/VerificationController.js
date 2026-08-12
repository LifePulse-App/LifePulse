// controllers/VerificationController.js
import Verification from "../models/VerificationRequest.js";
import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";

export const submitVerification = catchAsyncErrors(async (req, res, next) => {
  const currentUserId = req.user._id;
  const { fullName, stageName, category, publicProfileLink, documentUrl, selfieUrl, verificationCode } = req.body;

  if (!fullName || !stageName || !category || !publicProfileLink || !documentUrl || !selfieUrl || !verificationCode) {
    return next(new ErrorHandler("All fields, image URLs, and verification codes are required.", 400));
  }

  const currentUser = await User.findById(currentUserId);
  if (currentUser.tick && currentUser.tick !== "none") {
    return next(new ErrorHandler("Your account is already verified!", 400));
  }

  const existing = await Verification.findOne({ user: currentUserId, status: "pending" });
  if (existing) {
    return next(new ErrorHandler("You already have a pending verification request under review.", 400));
  }

  await Verification.findOneAndUpdate(
    { user: currentUserId },
    {
      fullName: String(fullName).trim(),
      stageName: String(stageName).trim(),
      category,
      publicProfileLink: String(publicProfileLink).trim(),
      documentUrl,   // Saves the 0x0.st direct link
      selfieUrl,     // Saves the 0x0.st direct link
      verificationCode,
      status: "pending",
      adminNotes: "",
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ 
    success: true, 
    message: "Verification application submitted successfully!" 
  });
});

export const getVerificationStatus = catchAsyncErrors(async (req, res, next) => {
  const verificationReq = await Verification.findOne({ user: req.user._id });

  res.status(200).json({ 
    success: true, 
    tick: req.user.tick,
    requestStatus: verificationReq ? verificationReq.status : "none",
    adminNotes: verificationReq ? verificationReq.adminNotes : null 
  });
});

export const getPendingVerifications = catchAsyncErrors(async (req, res, next) => {
  const requests = await Verification.find({ status: "pending" })
    .populate("user", "name username email avatarUrl")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: requests.length, requests });
});

export const reviewVerification = catchAsyncErrors(async (req, res, next) => {
  const { requestId } = req.params;
  const { action, adminNotes } = req.body; // action: 'approve', 'reject', 'dismiss'

  const verificationReq = await Verification.findById(requestId);
  if (!verificationReq) {
    return next(new ErrorHandler("Verification request not found.", 404));
  }

  if (action === "approve") {
    verificationReq.status = "approved";
    verificationReq.adminNotes = String(adminNotes || "Approved by administration.").trim();
    await verificationReq.save();
    await User.findByIdAndUpdate(verificationReq.user, { tick: "verified" });
  } else if (action === "reject") {
    verificationReq.status = "rejected";
    verificationReq.adminNotes = String(adminNotes || "Application rejected.").trim();
    await verificationReq.save();
  } else if (action === "dismiss") {
    verificationReq.status = "dismissed";
    verificationReq.adminNotes = String(adminNotes || "Request dismissed.").trim();
    await verificationReq.save();
  } else {
    return next(new ErrorHandler("Invalid action type.", 400));
  }

  res.status(200).json({ success: true, message: `Verification request successfully ${action}ed.` });
});