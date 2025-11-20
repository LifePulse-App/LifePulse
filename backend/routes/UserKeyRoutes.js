import express from "express";
import {
  uploadPublicKey,
  getUserPublicKey,
} from "../controllers/userKeysController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/keys/public", protect, uploadPublicKey);
router.get("/keys/public/:userId", protect, getUserPublicKey);

export default router;