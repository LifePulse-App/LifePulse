import User from "../models/UserSchema.js";
import Mood from "../models/MoodSchema.js";
import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";
import { calculateXpProgress } from "../helpers/levels.js";
import { getStreakTitle } from "../helpers/streak.js";
const toUtcMidnight = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const MOTIVATIONAL_QUOTES = [
  "Believe in progress, not perfection.",
  "Small steps every day lead to big results.",
  "Consistency beats intensity.",
  "Your streak is your superpower.",
  "Every habit counts.",
  "Keep going, you’re leveling up.",
  "Focus on the journey, not just the destination.",
  "Strive for progress, not perfection.",
  "Today’s effort builds tomorrow’s achievement.",
  "Success is built on daily wins.",
  "One step at a time.",
  "Your future self will thank you.",
  "Don’t break the chain!",
  "Level up your life, one habit at a time.",
  "Great things take time.",
  "Stay committed, stay consistent.",
  "Your XP is your proof.",
  "Every mood log is a step forward.",
  "Consistency is your secret weapon.",
  "Small victories lead to legendary achievements",
];

const getRandomQuote = () =>
  MOTIVATIONAL_QUOTES[
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  ];

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

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // include totalXp/level/currentTitle if you want, but at least totalXp
    const user = await User.findById(userId).select(
      "name xp totalXp streak level currentTitle"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const startOfToday = toUtcMidnight(now);
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    // ---- Check if user has at least one verified proof TODAY ----
    const hasTodayVerifiedProof = await Proof.exists({
      user: userId,
      verified: true,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    });

    // ---- Streak logic ----
    const lastUpdated = user.streak?.lastUpdated
      ? new Date(user.streak.lastUpdated)
      : null;

    let streakCount = user.streak?.count || 0;

    if (!lastUpdated) {
      streakCount = hasTodayVerifiedProof ? 1 : 0;
    } else {
      const startOfLast = toUtcMidnight(lastUpdated);

      const daysDiff = Math.floor(
        (startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        if (streakCount === 0 && hasTodayVerifiedProof) streakCount = 1;
      } else if (daysDiff === 1) {
        if (hasTodayVerifiedProof) streakCount = (streakCount || 0) + 1;
      } else if (daysDiff > 1) {
        streakCount = hasTodayVerifiedProof ? 1 : 0;
      }
    }

    // only save when we actually update streak
    if (hasTodayVerifiedProof) {
      user.streak = { count: streakCount, lastUpdated: now };
      await user.save();
    }

    // ---- XP progress: READ ONLY from stored totals ----
    const storedTotalXp = Number(user.totalXp ?? user.xp ?? 0);
    const xpProgress = calculateXpProgress(storedTotalXp);

    const streakTitle = getStreakTitle(streakCount);

    // ---- Quick logs & secondary cards ----
    const [recentMood, recentHabit, recentProof, reflectionDayAgg, habitCompletionRate] =
      await Promise.all([
        Mood.findOne({ user: userId }).sort({ createdAt: -1 }),
        Habit.findOne().sort({ createdAt: -1 }),
        Proof.findOne({ user: userId }).sort({ createdAt: -1 }),
        Mood.aggregate([
          { $match: { user: userId } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
            },
          },
        ]),
        Proof.countDocuments({ user: userId }),
      ]);

    const reflectionCount = reflectionDayAgg.length;

    // ---- Current mood logic ----
    let currentMood = null;
    if (recentMood) {
      const moodDate = new Date(recentMood.createdAt);
      const startOfMoodDay = toUtcMidnight(moodDate);
      if (startOfMoodDay.getTime() === startOfToday.getTime()) {
        currentMood = { mood: recentMood.mood, createdAt: recentMood.createdAt };
      }
    }

    const secondaryCards = {
      motivation: getRandomQuote(),
      reflectionCount,
      habitCompletionRate,
    };

    return res.status(200).json({
      success: true,
      data: {
        greeting: `Welcome back, ${user.name}!`,
        profile: {
          name: user.name,
          xpProgress,
          streak: user.streak,
          streakTitle,
        },
        quickLogs: {
          mood: recentMood,
          habit: recentHabit,
          proof: recentProof,
        },
        currentMood,
        secondaryCards,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};