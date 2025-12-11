import User from "../models/UserSchema.js";
import Mood from "../models/MoodSchema.js";
import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";
import { LEVELS, calculateXpProgress } from "../helpers/levels.js";
import { getStreakTitle } from "../helpers/streak.js";

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
    const user = await User.findById(userId).select("name xp streak");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    // ---- Check if user has at least one verified proof TODAY ----
    const hasTodayVerifiedProof = await Proof.exists({
      user: userId,
      verified: true,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    });

    // ---- Streak logic (increment when at least one proof today) ----
    const lastUpdated = user.streak?.lastUpdated
      ? new Date(user.streak.lastUpdated)
      : null;

    let streakCount = user.streak?.count || 0;

    if (!lastUpdated) {
      // first time using streak
      streakCount = hasTodayVerifiedProof ? 1 : 0;
    } else {
      const startOfLast = new Date(lastUpdated);
      startOfLast.setHours(0, 0, 0, 0);

       const daysDiff = Math.floor(
           (startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24)
         );

      if (daysDiff === 0) {
        // same calendar day
        if (streakCount === 0 && hasTodayVerifiedProof) {
          // first ever proof today
          streakCount = 1;
        }
        // otherwise keep streakCount as is
      } else if (daysDiff === 1) {
        // yesterday was last updated day
        if (hasTodayVerifiedProof) {
          // continuous streak
          streakCount = (streakCount || 0) + 1;
        } else {
          // no proof today yet: you can keep streak as-is or decide to reset later
          // here we keep it for now; it will reset if user skips a full day and comes back
        }
      } else if (daysDiff > 1) {
        // gap of >= 2 days -> streak broken
        streakCount = hasTodayVerifiedProof ? 1 : 0;
      }
    }

      if (hasTodayVerifiedProof) {
          user.streak = { count: streakCount, lastUpdated: now };
          await user.save();
        } else {
          // preserve lastUpdated and streakCount if no proof today
          user.streak = { count: streakCount, lastUpdated: user.streak?.lastUpdated || null };
        }

    // ---- Calculate XP (single source of truth here) ----
    let totalXp = 0;

    // 1) XP from verified proofs + their habits (global catalog)
    const verifiedProofs = await Proof.find({
      user: userId,
      verified: true,
    }).populate("habit");

      let rewardEarned = 0;
      for (const proof of verifiedProofs) {
      const habit = proof.habit;
      if (!habit) continue;

      const type = (habit.habitName || "").trim().toLowerCase();

      if (HABIT_XP[type]) {
        totalXp += HABIT_XP[type].base + HABIT_XP[type].verified;
        rewardEarned += 5; 
      } else {
        totalXp += 10;
        rewardEarned += 2
      }
    }

    user.rewardBalance = (user.rewardBalance || 0) + rewardEarned;

    // 2) Mood XP based on DISTINCT days with at least one mood
    const moodDayAgg = await Mood.aggregate([
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
    ]);
    const uniqueMoodDays = moodDayAgg.length;
    totalXp += uniqueMoodDays * 10;

    user.xp = totalXp;

  const xpProgress = calculateXpProgress(totalXp);
   user.level = xpProgress.level;
  user.currentTitle = xpProgress.title;
  await user.save();

    // ---- Streak title ----
    const streakTitle = getStreakTitle(streakCount);

    // ---- Quick logs & secondary cards ----
    const [
      recentMood,
      recentHabit,
      recentProof,
      reflectionDayAgg,
      habitCompletionRate,
    ] = await Promise.all([
      Mood.findOne({ user: userId }).sort({ createdAt: -1 }),
      Habit.findOne().sort({ createdAt: -1 }), // global habit
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

    // ---- Current mood logic (reset at 12 AM) ----
    let currentMood = null;
    if (recentMood) {
      const moodDate = new Date(recentMood.createdAt);
      const startOfMoodDay = new Date(moodDate);
      startOfMoodDay.setHours(0, 0, 0, 0);

      if (startOfMoodDay.getTime() === startOfToday.getTime()) {
        currentMood = {
          mood: recentMood.mood,
          createdAt: recentMood.createdAt,
        };
      } else {
        currentMood = null;
      }
    }

    const secondaryCards = {
      motivation: getRandomQuote(),
      reflectionCount,
      habitCompletionRate,
    };

    res.status(200).json({
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
    res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard" });
  }
};