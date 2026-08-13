import Proof from "../models/ProofSchema.js";
import Habit from "../models/HabitSchema.js";
import User from "../models/UserSchema.js";
import axios from "axios";
import { recalculateXp } from "./XpController.js";
import { getTimeSlotForDate } from "../utils/timeSlotCheck.js";
import fs from "fs";
import FormData from "form-data";

export const submitProof = async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { habitId } = req.body;
    // 🔒 Security: Use authenticated user ID over req.body
    const userId = req.user?.id || req.user?._id || req.body.userId;

    if (!habitId || !filePath) {
      return res.status(400).json({ success: false, message: "habitId and proof image required." });
    }

    const habit = await Habit.findOne({ _id: habitId, active: true });
    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found." });
    }

    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // ⏱️ 1. Determine time slot just for record-keeping (No restrictions/blocks applied)
    const currentSlot = getTimeSlotForDate(new Date());

    // ⚡ 2. AI Verification Request (with timeout)
    const formData = new FormData();
    formData.append("habitKey", habit.key);
    formData.append("image", fs.createReadStream(filePath));

    const aiRes = await axios.post("https://api-ai.streaksphere.app/verify", formData, {
      headers: formData.getHeaders(),
      timeout: 10000 // 10-second request timeout
    });

    const isVerified = !!aiRes.data.verified;
    const pointsAwarded = isVerified ? 50 : 1;
    const xpMultEnabled = userDoc?.premiumPreferences?.xpMultiplier !== false;
    const isPremiumXP = !!(userDoc?.isPremium && xpMultEnabled);
    const habitName = habit.name || habit.title || habit.key;

    // 💾 3. Database Persistence (after AI response)
    const proof = await Proof.create({
      user: userId,
      habit: habit._id,
      imageUrl: filePath, // Note: Replace with S3/Cloudinary URL in production
      status: isVerified ? "verified" : "rejected",
      points: pointsAwarded,
      verified: isVerified,
      aiScore: aiRes.data.score,
      verifiedAt: isVerified ? new Date() : null,
      timeSlotAtProof: currentSlot, // Still saving when they did it, but not blocking them
      isPremiumXP,
      caption: habitName,
      visibilityScope: userDoc.postVisibility || "friends", // matched to schema enum
      city: userDoc.city || "",
      country: userDoc.country || ""
    });

    if (isVerified) {
      await recalculateXp(userId);
    }

    return res.json({
      success: true,
      status: proof.status,
      points: proof.points,
      proofId: proof._id,
      predictedActivity: aiRes.data.predictedActivity,
      predictedScore: aiRes.data.score
    });

  } catch (error) {
    console.error("Submit Proof Error:", error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Failed to submit proof." });
  } finally {
    // 🧹 4. Always Clean Up Disk Storage
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error("Failed to delete temp file:", cleanupErr);
      }
    }
  }
};