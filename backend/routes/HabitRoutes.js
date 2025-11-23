import express from "express";
import {
  createHabit,
  listHabits,
  getTodayHabits,
  updateHabit,
  deleteHabit,
  completeHabit,
} from "../controllers/HabitController.js";
const router = express.Router();

router.get("/", listHabits);
router.post("/", createHabit);
router.get("/today", getTodayHabits);
router.patch("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/complete", completeHabit);

export default router;