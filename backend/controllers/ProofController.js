import Proof from "../models/ProofSchema.js";
import Habit from "../models/HabitSchema.js";
import User from "../models/UserSchema.js";
import axios from "axios";
import { recalculateXp } from "./XpController.js";
import { getTimeSlotForDate } from "../utils/timeSlotCheck.js";
import fs from "fs";
import FormData from "form-data"; 

export const submitProof = async (req, res) => {
  try {
    const { habitId, userId } = req.body;
    if (!habitId || !req.file) {
      return res.status(400).json({ success: false, message: "habitId and proof image required." });
    }

    const habit = await Habit.findOne({ _id: habitId, active: true });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found." });

    const userDoc = await User.findById(userId);
    const xpMultEnabled = userDoc?.premiumPreferences?.xpMultiplier !== false;
    const isPremiumXP = !!(userDoc?.isPremium && xpMultEnabled);

    const currentSlot = getTimeSlotForDate(new Date());
    const expectedSlot = habit.timeSlot;
    const isTimeValid = !expectedSlot || currentSlot === expectedSlot;

    // 🔥 DYNAMIC CAPTION & VISIBILITY:
    const habitName = habit.name || habit.title || habit.key; 
    const generatedCaption = `${habitName}`;

    const proof = await Proof.create({
      user: userId,
      habit: habit._id,
      // ⚡ FIX: Use req.file.filename instead of req.file.path for the web URL
      imageUrl: `/uploads/${req.file.filename}`, 
      status: "submitted",
      points: 1,
      verified: false,
      timeSlotAtProof: currentSlot,
      isPremiumXP: isPremiumXP,
      caption: generatedCaption,
      visibilityScope: userDoc.postVisibility || "friends", // Fixed from "friend" to "friends"
      city: userDoc.city || "",
      country: userDoc.country || ""
    });

    // Send image to FastAPI AI verification
    const formData = new FormData();
    formData.append("habitKey", habit.key);
    // Note: We still use req.file.path here because Node.js needs the disk path to read it!
    formData.append("image", fs.createReadStream(req.file.path));

    const aiRes = await axios.post("https://api-ai.streaksphere.app/verify", formData, {
      headers: formData.getHeaders(),
    });

    proof.status = aiRes.data.verified ? "verified" : "rejected";
    proof.points = aiRes.data.verified ? 50 : 1;
    proof.verified = !!aiRes.data.verified;
    proof.aiScore = aiRes.data.score;
    if (proof.verified) proof.verifiedAt = new Date();

    await proof.save();

    if (proof.verified) await recalculateXp(userId);

    return res.json({
      success: true,
      status: proof.status,
      points: proof.points,
      proofId: proof._id,
      predictedActivity: aiRes.data.predictedActivity,
      predictedScore: aiRes.data.score
    });
  } catch (error) {
    console.error("Submit Proof Error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit proof." });
  }
};