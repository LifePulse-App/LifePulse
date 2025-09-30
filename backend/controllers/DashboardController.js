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
  "Small victories lead to legendary achievements"
];

const getRandomQuote = () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

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
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ---- Update streak dynamically ----
    const today = new Date();
    const lastUpdated = user.streak?.lastUpdated ? new Date(user.streak.lastUpdated) : null;
    let streakCount = user.streak?.count || 0;

    if (!lastUpdated || (today - lastUpdated) / (1000 * 60 * 60 * 24) > 1) {
      streakCount = 1; // reset streak
    } else if ((today - lastUpdated) / (1000 * 60 * 60 * 24) === 1) {
      streakCount += 1; // consecutive day
    }
    user.streak = { count: streakCount, lastUpdated: today };
    await user.save();

    // ---- Calculate XP ----
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
    user.xp = totalXp;
    await user.save();

    // ---- XP progress ----
    const xpProgress = calculateXpProgress(totalXp);

    // ---- Streak title ----
    const streakTitle = getStreakTitle(streakCount);

    // ---- Quick logs & secondary cards ----
    const [recentMood, recentHabit, recentProof, reflectionCount, habitCompletionRate] = await Promise.all([
      Mood.findOne({ user: userId }).sort({ createdAt: -1 }),
      Habit.findOne({ user: userId }).sort({ createdAt: -1 }),
      Proof.findOne({ user: userId }).sort({ createdAt: -1 }),
      Mood.countDocuments({ user: userId }),
      Habit.countDocuments({ user: userId, completed: true }),
    ]);

    const secondaryCards = {
      motivation: getRandomQuote(),
      reflectionCount,
      habitCompletionRate,
    };

    // ---- Response ----
    res.status(200).json({
      success: true,
      data: {
        greeting: `Welcome back, ${user.name}!`,
        profile: { name: user.name, xpProgress, streak: user.streak, streakTitle },
        quickLogs: { mood: recentMood, habit: recentHabit, proof: recentProof },
        secondaryCards,
      },
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};
