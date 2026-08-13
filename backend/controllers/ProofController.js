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
  const fileName = req.file?.filename;

  try {
    const { habitId } = req.body;
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

    const currentSlot = getTimeSlotForDate(new Date());

    // ⚡ AI Verification Request
    const formData = new FormData();
    formData.append("habitKey", habit.key);
    formData.append("image", fs.createReadStream(filePath));

    const aiRes = await axios.post("https://api-ai.streaksphere.app/verify", formData, {
      headers: formData.getHeaders(),
      timeout: 10000 
    });

    const isVerified = !!aiRes.data.verified;
    const pointsAwarded = isVerified ? 50 : 1;
    const xpMultEnabled = userDoc?.premiumPreferences?.xpMultiplier !== false;
    const isPremiumXP = !!(userDoc?.isPremium && xpMultEnabled);
    const habitName = habit.name || habit.title || habit.key;

    // 💾 Database Persistence
    const proof = await Proof.create({
      user: userId,
      habit: habit._id,
      imageUrl: `/proofs/${fileName}`, // Saved as /proofs/filename for web serving
      status: isVerified ? "verified" : "rejected",
      points: pointsAwarded,
      verified: isVerified,
      aiScore: aiRes.data.score,
      verifiedAt: isVerified ? new Date() : null,
      timeSlotAtProof: currentSlot,
      isPremiumXP,
      caption: habitName,
      visibilityScope: userDoc.postVisibility || "friends",
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
    
    // File deletion logic removed. Files will stay on disk even if an error occurs.
    
    return res.status(500).json({ success: false, message: "Failed to submit proof." });
  }
};