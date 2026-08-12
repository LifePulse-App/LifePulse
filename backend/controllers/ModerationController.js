import Report from "../models/ReportSchema.js";
import User from "../models/UserSchema.js";
import Post from "../models/ProofSchema.js"; // Adjust path to your Post schema
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import PostReport from "../models/PostReport.js";

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

// 1. User reports a specific post
export const reportPost = catchAsyncErrors(async (req, res, next) => {
  const { postId } = req.params;
  const { reason, details, mediaUrl } = req.body; // ⚡ Destructure mediaUrl from req.body

  if (!postId) {
    return next(new ErrorHandler("Post ID is required.", 400));
  }

  // Check that the post exists
  const post = await Post.findById(postId);
  

  if (!post) {
    return next(new ErrorHandler("Post not found.", 404));
  }

  // Don't allow users to report their own post
  if (String(post.user) === String(req.user._id)) {
    return next(
      new ErrorHandler("You cannot report your own post.", 400)
    );
  }

  // Prevent duplicate pending report
  const existingReport = await PostReport.findOne({
    reporter: req.user._id,
    reportedPost: postId,
    status: "pending",
  });

  if (existingReport) {
    return res.status(400).json({
      success: false,
      message:
        "You have already reported this post. It is currently under review.",
    });
  }

  await PostReport.create({
    reporter: req.user._id,
    reportedPost: postId,
    reason,
    details,
    mediaUrl: mediaUrl || post.imageUrl, // ⚡ Save mediaUrl (falls back to post.mediaUrl if not passed)
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Post reported successfully.",
  });
});

export const getPostReports = catchAsyncErrors(
  async (req, res, next) => {
    const reports = await PostReport.find({
      status: "pending",
    })
      .populate("reporter", "name username")
      .populate(
        "reportedPost",
        "mediaUrl caption adminRemoved user"
      )
      .sort({ createdAt: -1 })
      .lean();

    // ⚡ Normalize mediaUrl so admin.html can render it properly
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const formattedReports = reports.map((rep) => {
      // Prioritize the snapshot mediaUrl on the report, or fall back to the populated post's mediaUrl
      let rawMedia = rep.mediaUrl || rep.reportedPost?.mediaUrl || "";

      return {
        ...rep,
        reportedPost: rep.reportedPost ? {
          ...rep.reportedPost,
          mediaUrl: rawMedia
        } : { mediaUrl: rawMedia }
      };
    });

    res.json({
      success: true,
      reports: formattedReports,
    });
  }
);

// 3. Admin REMOVES the post
export const removeReportedPost = catchAsyncErrors(
  async (req, res, next) => {
    const { postId, reportId } = req.body;

    if (!postId || !reportId) {
      return next(
        new ErrorHandler(
          "Post ID and Report ID are required.",
          400
        )
      );
    }

    const post = await Post.findById(postId);

    if (!post) {
      return next(new ErrorHandler("Post not found.", 404));
    }

    const report = await PostReport.findById(reportId);

    if (!report) {
      return next(new ErrorHandler("Post report not found.", 404));
    }

    // Make sure this report actually belongs to this post
    if (String(report.reportedPost) !== String(postId)) {
      return next(
        new ErrorHandler(
          "This report does not belong to this post.",
          400
        )
      );
    }

    // Remove post
    post.adminRemoved = true;
    await post.save();

    // Mark report as action taken
    report.status = "action_taken";
    await report.save();

    res.json({
      success: true,
      message: "Post has been removed for violations.",
    });
  }
);

// 4. Admin DISMISSES the post report (Post stays visible)
export const dismissPostReport = catchAsyncErrors(
  async (req, res, next) => {
    const { reportId } = req.body;

    if (!reportId) {
      return next(
        new ErrorHandler("Report ID is required.", 400)
      );
    }

    const report = await PostReport.findById(reportId);

    if (!report) {
      return next(
        new ErrorHandler("Post report not found.", 404)
      );
    }

    report.status = "dismissed";

    await report.save();

    res.json({
      success: true,
      message: "Post report dismissed.",
    });
  }
);