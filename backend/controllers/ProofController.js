import Proof from "../models/ProofSchema.js";
import Habit from "../models/HabitSchema.js";
import axios from "axios";
import { recalculateXp } from "./XpController.js";
import { getTimeSlotForDate } from "../utils/timeSlotCheck.js";

// Submit a habit proof (with image + AI check and time-slot validation)
export const submitProof = async (req, res) => {
  try {
    const { habitId, userId } = req.body; // predefined Habit _id

    if (!habitId || !req.file) {
      return res.status(400).json({
        success: false,
        message: "habitId and proof image are required.",
      });
    }

    // Predefined habit (global)
    const habit = await Habit.findOne({ _id: habitId, active: true });
    if (!habit) {
      return res
        .status(404)
        .json({ success: false, message: "Habit not found." });
    }

    // Time window check
    const currentSlot = getTimeSlotForDate(new Date()); // "morning"/"afternoon"/"evening"/"night"
    const expectedSlot = habit.timeSlot; // from DB
    const isTimeValid = !expectedSlot || currentSlot === expectedSlot;

    const initialStatus = isTimeValid ? "submitted" : "rejected";
    const initialPoints = isTimeValid ? 1 : 0;

    // Create initial proof
    const proof = await Proof.create({
      user: userId,
      habit: habit._id,
      imageUrl: req.file.path,
      status: initialStatus,
      points: initialPoints,
      verified: false,
      timeSlotAtProof: currentSlot,
    });

    // If wrong time window, don't call AI model
    if (!isTimeValid) {
      return res.json({
        success: true,
        status: "rejected",
        points: 0,
        proofId: proof._id,
        reason: `This habit is for ${expectedSlot}, but proof was taken in ${currentSlot} window.`,
      });
    }

    // Call AI verification microservice
    try {
      const aiRes = await axios.post("http://localhost:8000/verify", {
        imageUrl: req.file.path,
        habitName: habit.key, // use key to match HABIT_LABEL_MAP
      });

      proof.status = aiRes.data.verified ? "verified" : "rejected";
      proof.points = aiRes.data.verified ? 10 : 0;
      proof.verified = !!aiRes.data.verified;
      proof.aiScore = aiRes.data.score;
      if (proof.verified) proof.verifiedAt = new Date();

      await proof.save();

      // Award XP only on verified proofs
      if (proof.verified) {
        await recalculateXp(userId);
      }

      return res.json({
        success: true,
        status: proof.status,
        points: proof.points,
        proofId: proof._id,
      });
    } catch (err) {
      console.error("AI verification error:", err);
      await proof.save();
      return res.json({
        success: true,
        status: proof.status,
        points: proof.points,
        aiError: true,
      });
    }
  } catch (error) {
    console.error("Submit Proof Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to submit proof." });
  }
};