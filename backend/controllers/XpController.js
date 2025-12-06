import mongoose from "mongoose";
import User from "../models/UserSchema.js";
import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";
import Mood from "../models/MoodSchema.js";
import { calculateXpProgress } from "../helpers/levels.js";

const HABIT_XP = {
  // movement / fitness
  pushups: { base: 30, verified: 40 },
  pullups: { base: 35, verified: 45 },
  plank: { base: 20, verified: 30 },
  squats: { base: 30, verified: 40 },
  deadlifts: { base: 40, verified: 50 },
  "bench press": { base: 40, verified: 50 },
  yoga: { base: 25, verified: 35 },
  meditation: { base: 15, verified: 15 },
  running: { base: 30, verified: 40 },
  jogging: { base: 25, verified: 35 },
  walking: { base: 10, verified: 20 },
  cycling: { base: 30, verified: 40 },
  swimming: { base: 35, verified: 45 },
  "jump rope": { base: 20, verified: 30 },
  stretching: { base: 15, verified: 25 },
  football: { base: 25, verified: 35 },
  basketball: { base: 25, verified: 35 },
  tennis: { base: 25, verified: 35 },
  badminton: { base: 20, verified: 30 },
  "table tennis": { base: 15, verified: 25 },
  boxing: { base: 30, verified: 40 },
  "martial arts": { base: 30, verified: 40 },
  "dance practice": { base: 20, verified: 30 },

  // health / nutrition
  "drink water": { base: 5, verified: 10 },
  "drink tea": { base: 5, verified: 10 },
  "drink coffee": { base: 5, verified: 10 },
  "eat breakfast": { base: 10, verified: 20 },
  "eat lunch": { base: 10, verified: 20 },
  "eat dinner": { base: 10, verified: 20 },
  "eat fruit": { base: 10, verified: 20 },
  "eat vegetables": { base: 10, verified: 20 },
  "no junk food": { base: 15, verified: 25 },
  "cook at home": { base: 15, verified: 25 },
  "meal prep": { base: 20, verified: 30 },
  "take vitamins": { base: 10, verified: 20 },
  "brush teeth": { base: 5, verified: 10 },
  "floss teeth": { base: 5, verified: 10 },
  "skincare routine": { base: 10, verified: 20 },
  "weigh yourself": { base: 5, verified: 10 },

  // sleep & recovery
  "go to bed early": { base: 20, verified: 0 },
  "wake up early": { base: 20, verified: 0 },
  "power nap": { base: 10, verified: 0 },

  // learning / mental
  reading: { base: 15, verified: 25 },
  study: { base: 20, verified: 30 },
  "online course": { base: 20, verified: 30 },
  "language learning": { base: 20, verified: 30 },
  journal: { base: 10, verified: 20 },
  "gratitude journal": { base: 10, verified: 20 },
  "planning day": { base: 10, verified: 20 },
  "coding practice": { base: 25, verified: 35 },
  "music practice": { base: 20, verified: 30 },
  "draw or paint": { base: 15, verified: 25 },
  "play instrument": { base: 15, verified: 25 },

  // work / productivity
  "deep work": { base: 25, verified: 35 },
  "no phone distraction": { base: 15, verified: 25 },
  "check email once": { base: 10, verified: 20 },
  "daily review": { base: 15, verified: 25 },
  "clean desk": { base: 10, verified: 20 },

  // household / chores
  "clean room": { base: 15, verified: 25 },
  "do laundry": { base: 15, verified: 25 },
  "wash dishes": { base: 10, verified: 20 },
  "make bed": { base: 10, verified: 20 },
  "take out trash": { base: 10, verified: 20 },
  "grocery shopping": { base: 15, verified: 25 },
  "water plants": { base: 10, verified: 20 },
  "pet care": { base: 15, verified: 25 },

  // social / family
  "call family": { base: 10, verified: 20 },
  "meet a friend": { base: 10, verified: 20 },
  "play with kids": { base: 15, verified: 25 },
  "date night": { base: 15, verified: 25 },

  // mindfulness / self-care
  meditate: { base: 15, verified: 15 },
  "breathing exercise": { base: 10, verified: 15 },
  "gratitude practice": { base: 10, verified: 15 },
  "digital detox": { base: 15, verified: 25 },
  "walk in nature": { base: 15, verified: 25 },

  // finance & admin
  "track expenses": { base: 15, verified: 25 },
  "budget review": { base: 15, verified: 25 },
  "check investments": { base: 10, verified: 20 },

  // creative / hobbies
  "photography practice": { base: 15, verified: 25 },
  "video editing": { base: 20, verified: 30 },
  gaming: { base: 10, verified: 20 },
  "cooking practice": { base: 15, verified: 25 },
  baking: { base: 15, verified: 25 },
  gardening: { base: 15, verified: 25 },
  "art practice": { base: 15, verified: 25 },

  // commute / errands
  "bike to work": { base: 15, verified: 25 },
  "walk to work": { base: 10, verified: 20 },
  "public transport": { base: 5, verified: 10 },

  // faith / spiritual
  prayer: { base: 15, verified: 25 },
  "read scripture": { base: 15, verified: 25 },
};

export const recalculateXp = async (userId) => {
  const objectId = new mongoose.Types.ObjectId(userId);

  // ----- TOTAL XP -----
  let totalXp = 0;

  const verifiedProofs = await Proof.find({
    user: objectId,
    verified: true,
  }).populate("habit");

  for (const proof of verifiedProofs) {
    const habit = proof.habit;
    if (!habit) continue;
    const type = (habit.habitName || "").trim().toLowerCase();
    if (HABIT_XP[type]) {
      totalXp += HABIT_XP[type].base + HABIT_XP[type].verified;
    } else {
      totalXp += 10;
    }
  }

  // Mood XP (one per calendar day)
  const moodDayAgg = await Mood.aggregate([
    { $match: { user: objectId } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        firstMood: { $min: "$createdAt" },
      },
    },
  ]);
  totalXp += moodDayAgg.length * 10;

  // ----- MONTHLY XP (same data scope) -----
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  let monthlyXp = 0;

  const verifiedProofsMonth = await Proof.find({
    user: objectId,
    verified: true,
    createdAt: { $gte: startOfMonth },
  }).populate("habit");

  for (const proof of verifiedProofsMonth) {
    const habit = proof.habit;
    if (!habit) continue;
    const type = (habit.habitName || "").trim().toLowerCase();
    if (HABIT_XP[type]) {
      monthlyXp += HABIT_XP[type].base + HABIT_XP[type].verified;
    } else {
      monthlyXp += 10;
    }
  }

  const moodDayAggMonth = await Mood.aggregate([
    { $match: { user: objectId, createdAt: { $gte: startOfMonth } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        firstMood: { $min: "$createdAt" },
      },
    },
  ]);
  monthlyXp += moodDayAggMonth.length * 10;

  // ----- Save to User -----
  const user = await User.findById(objectId);
  if (user) {
    user.totalXp = totalXp;
    user.monthlyXp = monthlyXp;
    user.xp = totalXp; // legacy field if you still use it

    const { level, title } = calculateXpProgress(totalXp);
    user.level = level;
    user.currentTitle = title;

    await user.save();
  }

  return calculateXpProgress(totalXp);
};