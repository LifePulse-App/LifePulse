import Proof from "../models/ProofSchema.js";
import { recalculateXp } from "./XpController.js";

export const verifyProof = async (req, res) => {
  try {
    const proofId = req.params.id;
    const proof = await Proof.findById(proofId);

    if (!proof) return res.status(404).json({ success: false, message: "Proof not found" });

    proof.verified = true;
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
