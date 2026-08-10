import Report from "../models/ReportSchema.js";
import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";

// 2. Report User & Auto-Suspend (Triggered at 5 reports in 24 hours)
export const reportUser = catchAsyncErrors(async (req, res, next) => {
  const currentUserId = req.user._id;
  const { targetUserId } = req.params;
  const { reason, details } = req.body;

  if (String(currentUserId) === String(targetUserId)) {
    return next(new ErrorHandler("You cannot report yourself.", 400));
  }

  // ⚡ Enforce limit: Only one active/pending report per user against the same target
  const existing = await Report.findOne({ 
    reporter: currentUserId, 
    reportedUser: targetUserId, 
    status: 'pending' 
  });
  
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      message: "You have already submitted a report for this user. It is currently under review." 
    });
  }

  await Report.create({ 
    reporter: currentUserId, 
    reportedUser: targetUserId, 
    reason, 
    details 
  });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reportCount = await Report.countDocuments({
    reportedUser: targetUserId,
    createdAt: { $gte: oneDayAgo },
    status: 'pending',
  });

  // ⚡ Trigger auto-suspension if report count reaches 5 in 24 hours
  if (reportCount >= 100) {
    const targetUser = await User.findById(targetUserId);
    if (targetUser && targetUser.accountStatus === 'active') {
      
      // Set expiration timer to exactly 24 hours from now
      const liftAtTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      targetUser.accountStatus = 'suspended';
      targetUser.suspensionDetails = {
        reason: 'Automated system suspension due to excessive user flags.',
        suspendedAt: new Date(),
        liftAt: liftAtTime, // Automatically lifts the suspension after 24 hours
      };

      // Blank active relationship pointers so they hide from search/leaderboards
      targetUser.partner = null;
      targetUser.partnerSince = null;
      targetUser.partnerGracePeriodEnd = null;

      await targetUser.save();
    }
  }

  res.status(201).json({ success: true, message: "Report submitted successfully." });
});

// 3. Submit Appeal
export const submitAppeal = catchAsyncErrors(async (req, res, next) => {
  const { appealText } = req.body;
  const user = await User.findById(req.user._id);

  if (user.accountStatus !== 'suspended') {
    return next(new ErrorHandler("Account is not suspended.", 400));
  }

  if (user.appealDetails?.status === 'pending') {
    return next(new ErrorHandler("You already have an appeal under review.", 400));
  }

  user.appealDetails = {
    status: 'pending',
    appealText: String(appealText || "").trim(),
    submittedAt: new Date(),
  };

  await user.save();
  res.json({ success: true, message: "Appeal submitted successfully." });
});

// 4. Dismiss a Report (Admin Only)
export const dismissReport = catchAsyncErrors(async (req, res, next) => {
  const { reportId } = req.body;

  if (!reportId) {
    return next(new ErrorHandler("Report ID is required.", 400));
  }

  const report = await Report.findById(reportId);
  
  if (!report) {
    return next(new ErrorHandler("Report not found.", 404));
  }

  // Update the status to 'dismissed'
  report.status = 'dismissed';
  await report.save();

  res.json({ success: true, message: "Report dismissed successfully." });
});