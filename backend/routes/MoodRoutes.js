import express from "express";
import { createMood } from "../controllers/moodController.js";
import { isAuthenticatedUser } from "../middleware/auth.js"; // adjust to your auth middleware

const router = express.Router();

router.post("/", isAuthenticatedUser, createMood);

export default router;