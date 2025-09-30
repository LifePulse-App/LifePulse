import User from "../models/UserSchema.js";
import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";
import Mood from "../models/MoodSchema.js";
import { calculateXpProgress } from "../helpers/levels.js";

const HABIT_XP = {
  study: { base: 20, verified: 30 },
  coding: { base: 40, verified: 50 },
  eating: { base: 10, verified: 30 },
  workout: { base: 30, verified: 50 },
  reading: { base: 15, verified: 25 },
  working: { base: 25, verified: 35 },
  meditation: { base: 15, verified: 15 },
  sleep: { base: 30, verified: 0 },
};

export const recalculateXp = async (userId) => {
  const habits = await Habit.find({ user: userId });
  let totalXp = 0;

  for (let habit of habits) {
    const type = habit.habitName.toLowerCase();
    const proof = await Proof.findOne({ user: userId, habitId: habit._id, verified: true });

    if (HABIT_XP[type]) {
      totalXp += HABIT_XP[type].base;
      if (proof) totalXp += HABIT_XP[type].verified;
    } else totalXp += 10;
  }

  totalXp += await Mood.countDocuments({ user: userId }) * 10;

  // Update user XP
  const user = await User.findById(userId);
  if (user) {
    user.xp = totalXp;
    await user.save();
  }

  return calculateXpProgress(totalXp);
};
