export const LEVEL_TITLES = [
  "Beginner Explorer","Rising Learner","Consistency Seeker","Achiever","Master Starter",
  "Dedicated Performer","Focused Dreamer","Steady Progressor","Daily Grinder","Consistent Achiever",
  "Rising Star","Life Explorer","Habit Builder","Momentum Keeper","Task Conqueror",
  "Goal Getter","Daily Hero","Challenge Chaser","XP Collector","Life Master",
  "Life Guru","Streak Champion","Mood Master","Goal Crusher","Achievement Legend",
  "Consistency King","XP Hero","Habit Champion","Routine Conqueror","Daily Legend",
  "Mood Guru","Life Pathfinder","Progress Ninja","Focus Wizard","Energy Leader",
  "Routine Master","Goal Warrior","XP Master","Life Strategist","Consistency Wizard",
  "Achievement Guru","Daily Victor","Mood Champion","Task Ninja","XP Legend",
  "Life Conqueror","Goal Hero","Master Explorer","Streak Guru","Legendary Achiever",
  "Consistency Hero","Life Overlord","Mood Overlord","XP Overlord","Habit Overlord",
  "Routine Overlord","Goal Overlord","Streak Overlord","Daily Overlord","Achievement Overlord",
  "Legendary Hero","Ultimate Master","Grand Explorer","Life Dominator","Mood Dominator",
  "XP Dominator","Habit Dominator","Goal Dominator","Routine Dominator","Streak Dominator",
  "Daily Dominator","Achievement Dominator","Legendary Dominator","Supreme Master","Life Legend",
  "Mood Legend","XP Legend","Habit Legend","Goal Legend","Routine Legend",
  "Streak Legend","Daily Legend","Achievement Legend","Ultimate Hero","Grand Master",
  "Supreme Achiever","Life Supreme","Mood Supreme","XP Supreme","Habit Supreme",
  "Goal Supreme","Routine Supreme","Streak Supreme","Daily Supreme","Achievement Supreme",
  "Legend Supreme (Maxed-Out)"
];

export const generateLevels = () => {
  const levels = [];
  let xp = 0;
  let increment = 100;
  for (let i = 1; i <= 100; i++) {
    levels.push({ level: i, title: LEVEL_TITLES[i - 1] || `Level ${i}`, xp });
    increment = Math.floor(increment * 1.12);
    xp += increment;
  }
  return levels;
};

export const LEVELS = generateLevels();

export const calculateXpProgress = (xp) => {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  return {
    level: current.level,
    title: current.title,
    currentXp: xp,
    nextLevelXp: next ? next.xp : null,
    progressPercent: next ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100) : 100,
  };
};