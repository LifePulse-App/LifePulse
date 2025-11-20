import express from "express";
import { getDashboard } from "../controllers/DashboardController.js";
import { verifyProof } from "../controllers/ProofController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", isAuthenticatedUser, getDashboard);
router.put("/proof/verify/:id", isAuthenticatedUser, verifyProof);

export default router;
