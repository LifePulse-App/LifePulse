import express from "express";
import { createMood, getWorldMoods } from "../controllers/MoodController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", isAuthenticatedUser, createMood);
router.get("/world", getWorldMoods); // public worldwide data

export default router;