import mongoose from "mongoose";

const postReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proof",
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "Spam or Scam",
        "harassment",
        "Inappropriate Content",
        "Harassment or Hate Speech",
        "other",
      ],
      required: true,
    },

    details: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    // ⚡ Added mediaUrl to preserve a snapshot of the flagged content
    mediaUrl: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "reviewed",
        "action_taken",
        "dismissed",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending reports from the same user
// against the same post.
postReportSchema.index(
  {
    reporter: 1,
    reportedPost: 1,
    status: 1,
  }
);

export default mongoose.model("PostReport", postReportSchema);