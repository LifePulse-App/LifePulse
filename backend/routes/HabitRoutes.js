import express from "express";
import {
  listHabits,
  getTodayHabits,
} from "../controllers/HabitController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";
const router = express.Router();

router.get("/", isAuthenticatedUser, listHabits);
router.get("/today",isAuthenticatedUser, getTodayHabits);

export default router;