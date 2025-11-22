import express from "express";
import { createMood } from "../controllers/MoodController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js"; // adjust to your auth middleware

const router = express.Router();

router.post("/", isAuthenticatedUser, createMood);

export default router;