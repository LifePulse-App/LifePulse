import mongoose from "mongoose";

const proofSchema = new mongoose.Schema(
  {
    // ==========================================
    // CORE PROOF DETAILS
    // ==========================================
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    habit: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
    imageUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["submitted", "verified", "rejected"],
      default: "submitted",
    },
    points: { type: Number, default: 1 },
    aiScore: Number,
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    timeSlotAtProof: { type: String }, // optional: store which slot was used when taking proof
    isPremiumXP: { type: Boolean, default: false },

    // ==========================================
    // ACTIVITY FEED / SOCIAL FEATURES
    // ==========================================
    // ⚡ NEW SOCIAL FIELDS
    caption: { 
      type: String, 
      maxLength: [500, "Caption cannot exceed 500 characters"], 
      default: "" 
    },
    hashtags: [{ 
      type: String, 
      lowercase: true, 
      trim: true 
    }], // Array of strings without the '#' symbol
// ⚡ FIXED: Renamed to match the Feed controller query
    visibilityScope: {
      type: String,
      enum: ["foryou", "world", "country", "city", "friends", "private"],
      default: "foryou",
    },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    
    // Likes System
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    
    // Comments Tracking
    commentsCount: { type: Number, default: 0 },

    // Post Reporting
    reports: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }],
    // Inside your Post/Proof Schema
adminRemoved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Optional: Add indexes for faster feed querying
proofSchema.index({ verified: 1, visibilityScope: 1, createdAt: -1 });

export default mongoose.model("Proof", proofSchema);