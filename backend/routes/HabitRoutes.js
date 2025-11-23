import express from "express";
import {
  listHabits,
  getTodayHabits,
} from "../controllers/HabitController.js";
const router = express.Router();

router.get("/", listHabits);
router.get("/today", getTodayHabits);

export default router;