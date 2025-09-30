import express from "express";
import { getDashboard } from "../controllers/DashboardController.js";
import { verifyProof } from "../controllers/ProofController.js";
import { recalculateXp } from "../controllers/XpController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", isAuthenticatedUser, getDashboard);
router.put("/proof/verify/:id", isAuthenticatedUser, verifyProof);
router.put("/xp/recalculate", isAuthenticatedUser, async (req, res) => {
  try {
    const xpProgress = await recalculateXp(req.user._id);
    res.status(200).json({ success: true, xpProgress });
  } catch (error) {
    console.error("XP Recalculate Error:", error);
    res.status(500).json({ success: false, message: "Failed to recalculate XP" });
  }
});

export default router;
