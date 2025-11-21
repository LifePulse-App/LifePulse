import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { completeHabit, createHabit, deleteHabit, getHabits, updateHabit } from "../controllers/HabitController.js";

const router = express.Router();

router.post("/add", isAuthenticatedUser, createHabit);
router.get("/getToday", isAuthenticatedUser, getHabits);
router.put("/update/:id", isAuthenticatedUser, updateHabit);
router.delete("/delete/:id", isAuthenticatedUser, deleteHabit);
router.post("/complete/:id", isAuthenticatedUser, completeHabit);

export default router;
