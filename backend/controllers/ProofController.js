import Proof from "../models/ProofSchema.js";
import Habit from "../models/HabitSchema.js";
import axios from "axios";
import { recalculateXp } from "./XpController.js";
import { getTimeSlotForDate } from "../utils/timeSlotCheck.js";
import fs from "fs";
import FormData from "form-data"; // also import FormData


// Submit a habit proof (image + AI verification)
export const submitProof = async (req, res) => {
  try {
    const { habitId, userId } = req.body;
    if (!habitId || !req.file) {
      return res.status(400).json({ success: false, message: "habitId and proof image required." });
    }

    const habit = await Habit.findOne({ _id: habitId, active: true });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found." });

    const currentSlot = getTimeSlotForDate(new Date());
    const expectedSlot = habit.timeSlot;
    const isTimeValid = !expectedSlot || currentSlot === expectedSlot;

    const proof = await Proof.create({
      user: userId,
      habit: habit._id,
      imageUrl: req.file.path,
      status: "submitted",
      points: 1,
      verified: false,
      timeSlotAtProof: currentSlot,
    });

    // Send image to FastAPI AI verification
    const formData = new FormData();
    formData.append("habitName", habit.key);
    formData.append("image", fs.createReadStream(req.file.path));

    const aiRes = await axios.post("https://api-ai.streaksphere.app/verify", formData, {
      headers: formData.getHeaders(),
    });

    console.log(aiRes);

    proof.status = aiRes.data.verified ? "verified" : "rejected";
    proof.points = aiRes.data.verified ? 10 : 0;
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
    });
  } catch (error) {
    console.error("Submit Proof Error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit proof." });
  }
};
