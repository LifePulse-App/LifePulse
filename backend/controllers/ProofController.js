import Proof from "../models/ProofSchema.js";
import Habit from "../models/HabitSchema.js";
import axios from "axios";
import { recalculateXp } from "./XpController.js";

// Submit a habit proof (with image + AI check)
export const submitProof = async (req, res) => {
  try {
    const { habitId } = req.body;
    const userId = req.user._id;
    if (!habitId || !req.file) {
      return res.status(400).json({ success: false, message: "habitId and proof image are required." });
    }

    const habit = await Habit.findOne({ _id: habitId, user: userId });
    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found." });
    }

    const proof = await Proof.create({
      user: userId,
      habitId,
      imageUrl: req.file.path,
      status: "submitted",
      points: 1,
      verified: false,
    });

    // Call AI verification microservice
    try {
      const aiRes = await axios.post("http://localhost:8000/verify", {
        imageUrl: req.file.path,
        habitName: habit.habitName,
      });

      proof.status = aiRes.data.verified ? "verified" : "rejected";
      proof.points = aiRes.data.verified ? 10 : 0;
      proof.verified = !!aiRes.data.verified;
      proof.aiScore = aiRes.data.score;
      if (proof.verified) proof.verifiedAt = new Date();
      await proof.save();

      return res.json({
        success: true,
        status: proof.status,
        points: proof.points,
        proofId: proof._id
      });
    } catch (err) {
      await proof.save();
      return res.json({ success: true, status: proof.status, points: proof.points, aiError: true });
    }
  } catch (error) {
    console.error("Submit Proof Error:", error);
    res.status(500).json({ success: false, message: "Failed to submit proof." });
  }
};

// Verify proof manually (moderation)
export const verifyProof = async (req, res) => {
  try {
    const proofId = req.params.id;
    const proof = await Proof.findById(proofId);

    if (!proof) return res.status(404).json({ success: false, message: "Proof not found" });

    proof.verified = true;
    proof.status = "verified";
    proof.verifiedAt = new Date();
    await proof.save();

    // Update XP after verification
    const xpProgress = await recalculateXp(proof.user);

    res.status(200).json({
      success: true,
      message: "Proof verified successfully",
      xpProgress,
    });

  } catch (error) {
    console.error("Proof Verification Error:", error);
    res.status(500).json({ success: false, message: "Failed to verify proof" });
  }
};

// List proofs for user (optionally filter by habit)
export const listProofs = async (req, res) => {
  try {
    const { habitId } = req.query;
    const userId = req.user._id;
    const query = { user: userId };
    if (habitId) query.habitId = habitId;
    const proofs = await Proof.find(query).sort({ createdAt: -1 });
    res.json({ success: true, proofs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to list proofs." });
  }
};

// Get single proof
export const getProof = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const proof = await Proof.findOne({ _id: id, user: userId });
    if (!proof) return res.status(404).json({ success: false, message: "Proof not found." });
    res.json({ success: true, proof });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching proof." });
  }
};