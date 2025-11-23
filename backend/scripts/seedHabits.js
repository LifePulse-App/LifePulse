import mongoose from "mongoose";
import Habit from "../models/HabitSchema.js";

/**
 * Predefined habits grouped by category.
 * Each has:
 * - key: MUST match what your AI model expects (HABIT_LABEL_MAP key)
 * - habitName: user-facing name
 * - label: slightly more descriptive label for UI
 * - icon: MaterialCommunityIcons name (for dashboard & camera modal)
 * - defaultTime: default display time
 * - timeSlot: "morning" | "afternoon" | "evening" | "night"
 * - group: high-level category for UI grouping
 */

const HABIT_DEFS = [
  // ---------------- MOVEMENT / FITNESS ----------------
  { key: "pushups",        habitName: "Push-ups",        label: "Do push-ups",               icon: "arm-flex",              defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "pullups",        habitName: "Pull-ups",        label: "Do pull-ups",               icon: "weight-lifter",         defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "plank",          habitName: "Plank",           label: "Hold a plank",              icon: "human-handsup",         defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "squats",         habitName: "Squats",          label: "Do bodyweight squats",      icon: "human-handsdown",       defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "deadlifts",      habitName: "Deadlifts",       label: "Do deadlifts",              icon: "weight-lifter",         defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "bench press",    habitName: "Bench Press",     label: "Bench press workout",       icon: "weight-lifter",         defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "yoga",           habitName: "Yoga",            label: "Do yoga session",           icon: "yoga",                  defaultTime: "06:30 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "meditation",     habitName: "Meditation",      label: "Meditate",                  icon: "meditation",            defaultTime: "09:00 PM", timeSlot: "night",     group: "Movement / Fitness" },
  { key: "running",        habitName: "Running",         label: "Go for a run",              icon: "run",                   defaultTime: "06:30 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "jogging",        habitName: "Jogging",         label: "Go for a jog",              icon: "run",                   defaultTime: "06:30 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "walking",        habitName: "Walking",         label: "Go for a walk",             icon: "walk",                  defaultTime: "06:30 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "cycling",        habitName: "Cycling",         label: "Go cycling",                icon: "bike",                  defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "swimming",       habitName: "Swimming",        label: "Go swimming",               icon: "swim",                  defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "jump rope",      habitName: "Jump Rope",       label: "Jump rope",                 icon: "jump-rope",             defaultTime: "07:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "stretching",     habitName: "Stretching",      label: "Do stretching routine",     icon: "human-handsup",         defaultTime: "08:00 AM", timeSlot: "morning",   group: "Movement / Fitness" },
  { key: "football",       habitName: "Football",        label: "Play football",             icon: "football",              defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "basketball",     habitName: "Basketball",      label: "Play basketball",           icon: "basketball-hoop",       defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "tennis",         habitName: "Tennis",          label: "Play tennis",               icon: "tennis",                defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "badminton",      habitName: "Badminton",       label: "Play badminton",            icon: "badminton",             defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "table tennis",   habitName: "Table Tennis",    label: "Play table tennis",         icon: "table-tennis",          defaultTime: "05:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "boxing",         habitName: "Boxing",          label: "Boxing practice",           icon: "boxing-glove",          defaultTime: "06:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "martial arts",   habitName: "Martial Arts",    label: "Practice martial arts",     icon: "karate",                defaultTime: "06:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },
  { key: "dance practice", habitName: "Dance Practice",  label: "Practice dancing",          icon: "dance-ballroom",        defaultTime: "06:00 PM", timeSlot: "evening",   group: "Movement / Fitness" },

  // ---------------- HEALTH / NUTRITION ----------------
  { key: "drink water",     habitName: "Drink Water",         label: "Drink a glass of water",        icon: "cup",               defaultTime: "08:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },
  { key: "drink tea",       habitName: "Drink Tea",           label: "Drink tea",                      icon: "tea",               defaultTime: "04:00 PM", timeSlot: "afternoon", group: "Health / Nutrition" },
  { key: "drink coffee",    habitName: "Drink Coffee",        label: "Drink coffee",                   icon: "coffee",            defaultTime: "09:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },
  { key: "eat breakfast",   habitName: "Eat Breakfast",       label: "Have breakfast",                 icon: "food-variant",      defaultTime: "08:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },
  { key: "eat lunch",       habitName: "Eat Lunch",           label: "Have lunch",                     icon: "food",              defaultTime: "01:00 PM", timeSlot: "afternoon", group: "Health / Nutrition" },
  { key: "eat dinner",      habitName: "Eat Dinner",          label: "Have dinner",                    icon: "food",              defaultTime: "08:00 PM", timeSlot: "night",     group: "Health / Nutrition" },
  { key: "eat fruit",       habitName: "Eat Fruit",           label: "Eat some fruit",                 icon: "apple",             defaultTime: "11:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },
  { key: "eat vegetables",  habitName: "Eat Vegetables",      label: "Eat vegetables",                 icon: "carrot",            defaultTime: "01:00 PM", timeSlot: "afternoon", group: "Health / Nutrition" },
  { key: "no junk food",    habitName: "No Junk Food",        label: "Avoid junk food",                icon: "food-off-outline",  defaultTime: "12:00 AM", timeSlot: "night",     group: "Health / Nutrition" },
  { key: "cook at home",    habitName: "Cook at Home",        label: "Cook a meal at home",            icon: "stove",             defaultTime: "07:00 PM", timeSlot: "evening",   group: "Health / Nutrition" },
  { key: "meal prep",       habitName: "Meal Prep",           label: "Prep meals",                     icon: "food-container",    defaultTime: "04:00 PM", timeSlot: "afternoon", group: "Health / Nutrition" },
  { key: "take vitamins",   habitName: "Take Vitamins",       label: "Take vitamins",                  icon: "pill",              defaultTime: "09:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },
  { key: "brush teeth",     habitName: "Brush Teeth",         label: "Brush your teeth",               icon: "toothbrush",        defaultTime: "10:00 PM", timeSlot: "night",     group: "Health / Nutrition" },
  { key: "floss teeth",     habitName: "Floss Teeth",         label: "Floss your teeth",               icon: "tooth",             defaultTime: "10:00 PM", timeSlot: "night",     group: "Health / Nutrition" },
  { key: "skincare routine",habitName: "Skincare Routine",    label: "Do skincare routine",            icon: "face-woman",        defaultTime: "10:30 PM", timeSlot: "night",     group: "Health / Nutrition" },
  { key: "weigh yourself",  habitName: "Weigh Yourself",      label: "Check your weight",              icon: "scale-bathroom",    defaultTime: "08:00 AM", timeSlot: "morning",   group: "Health / Nutrition" },

  // ---------------- SLEEP & RECOVERY ----------------
  { key: "go to bed early", habitName: "Go to Bed Early", label: "Sleep early",            icon: "bed",               defaultTime: "10:00 PM", timeSlot: "night",     group: "Sleep & Recovery" },
  { key: "wake up early",   habitName: "Wake Up Early",   label: "Wake up early",          icon: "alarm",             defaultTime: "06:00 AM", timeSlot: "morning",   group: "Sleep & Recovery" },
  { key: "power nap",       habitName: "Power Nap",       label: "Take a power nap",       icon: "sleep",             defaultTime: "02:00 PM", timeSlot: "afternoon", group: "Sleep & Recovery" },

  // ---------------- LEARNING / MENTAL ----------------
  { key: "reading",           habitName: "Reading",           label: "Read a book",                 icon: "book-open-page-variant", defaultTime: "09:00 PM", timeSlot: "night",     group: "Learning / Mental" },
  { key: "study",             habitName: "Study",             label: "Study session",               icon: "school",                 defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "online course",     habitName: "Online Course",     label: "Take an online course",       icon: "laptop",                 defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "language learning", habitName: "Language Learning", label: "Practice a language",         icon: "translate",              defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "journal",           habitName: "Journal",           label: "Write in your journal",       icon: "notebook",               defaultTime: "09:30 PM", timeSlot: "night",     group: "Learning / Mental" },
  { key: "gratitude journal", habitName: "Gratitude Journal", label: "Write gratitude entries",     icon: "notebook-heart",         defaultTime: "09:30 PM", timeSlot: "night",     group: "Learning / Mental" },
  { key: "planning day",      habitName: "Planning Day",      label: "Plan your day",               icon: "calendar-check",         defaultTime: "08:00 AM", timeSlot: "morning",   group: "Learning / Mental" },
  { key: "coding practice",   habitName: "Coding Practice",   label: "Practice coding",             icon: "code-tags",              defaultTime: "08:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "music practice",    habitName: "Music Practice",    label: "Practice music",              icon: "music",                  defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "draw or paint",     habitName: "Draw or Paint",     label: "Draw or paint",               icon: "brush",                  defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },
  { key: "play instrument",   habitName: "Play Instrument",   label: "Play an instrument",          icon: "guitar-acoustic",        defaultTime: "07:00 PM", timeSlot: "evening",   group: "Learning / Mental" },

  // ---------------- WORK / PRODUCTIVITY ----------------
  { key: "deep work",            habitName: "Deep Work",            label: "Focus deep work session",         icon: "briefcase-clock",     defaultTime: "10:00 AM", timeSlot: "morning",   group: "Work / Productivity" },
  { key: "no phone distraction", habitName: "No Phone Distraction", label: "Avoid phone distractions",        icon: "cellphone-off",       defaultTime: "10:00 AM", timeSlot: "morning",   group: "Work / Productivity" },
  { key: "check email once",     habitName: "Check Email Once",     label: "Only check email once",          icon: "email",               defaultTime: "11:00 AM", timeSlot: "morning",   group: "Work / Productivity" },
  { key: "daily review",         habitName: "Daily Review",         label: "Review your day",                icon: "clipboard-text",      defaultTime: "09:00 PM", timeSlot: "night",     group: "Work / Productivity" },
  { key: "clean desk",           habitName: "Clean Desk",           label: "Clean your desk",                icon: "desk",                defaultTime: "06:00 PM", timeSlot: "evening",   group: "Work / Productivity" },

  // ---------------- HOUSEHOLD / CHORES ----------------
  { key: "clean room",      habitName: "Clean Room",      label: "Clean your room",           icon: "broom",             defaultTime: "05:00 PM", timeSlot: "evening",   group: "Household / Chores" },
  { key: "do laundry",      habitName: "Do Laundry",      label: "Do the laundry",            icon: "washing-machine",   defaultTime: "03:00 PM", timeSlot: "afternoon", group: "Household / Chores" },
  { key: "wash dishes",     habitName: "Wash Dishes",     label: "Wash the dishes",           icon: "dishwasher",        defaultTime: "08:30 PM", timeSlot: "night",     group: "Household / Chores" },
  { key: "make bed",        habitName: "Make Bed",        label: "Make your bed",             icon: "bed-king",          defaultTime: "08:00 AM", timeSlot: "morning",   group: "Household / Chores" },
  { key: "take out trash",  habitName: "Take Out Trash",  label: "Take out the trash",        icon: "trash-can",         defaultTime: "08:00 PM", timeSlot: "night",     group: "Household / Chores" },
  { key: "grocery shopping",habitName: "Grocery Shopping",label: "Do grocery shopping",       icon: "cart",              defaultTime: "04:00 PM", timeSlot: "afternoon", group: "Household / Chores" },
  { key: "water plants",    habitName: "Water Plants",    label: "Water your plants",         icon: "watering-can",      defaultTime: "09:00 AM", timeSlot: "morning",   group: "Household / Chores" },
  { key: "pet care",        habitName: "Pet Care",        label: "Care for your pet",         icon: "dog",               defaultTime: "07:00 PM", timeSlot: "evening",   group: "Household / Chores" },

  // ---------------- SOCIAL / FAMILY ----------------
  { key: "call family",     habitName: "Call Family",     label: "Call a family member",      icon: "phone",             defaultTime: "08:00 PM", timeSlot: "evening",   group: "Social / Family" },
  { key: "meet a friend",   habitName: "Meet a Friend",   label: "Meet a friend",             icon: "account-group",     defaultTime: "06:00 PM", timeSlot: "evening",   group: "Social / Family" },
  { key: "play with kids",  habitName: "Play with Kids",  label: "Play with your kids",       icon: "baby-face-outline", defaultTime: "06:00 PM", timeSlot: "evening",   group: "Social / Family" },
  { key: "date night",      habitName: "Date Night",      label: "Go on a date night",        icon: "heart-outline",     defaultTime: "08:00 PM", timeSlot: "night",     group: "Social / Family" },

  // ---------------- MINDFULNESS / SELF-CARE ----------------
  { key: "meditate",           habitName: "Meditate",           label: "Meditate",                      icon: "meditation",        defaultTime: "09:00 PM", timeSlot: "night",     group: "Mindfulness / Self-care" },
  { key: "breathing exercise", habitName: "Breathing Exercise", label: "Do breathing exercises",        icon: "weather-windy",     defaultTime: "09:00 AM", timeSlot: "morning",   group: "Mindfulness / Self-care" },
  { key: "gratitude practice", habitName: "Gratitude Practice", label: "Practice gratitude",            icon: "notebook-heart",    defaultTime: "09:30 PM", timeSlot: "night",     group: "Mindfulness / Self-care" },
  { key: "digital detox",      habitName: "Digital Detox",      label: "Digital detox (no screens)",    icon: "cellphone-off",     defaultTime: "08:00 PM", timeSlot: "night",     group: "Mindfulness / Self-care" },
  { key: "walk in nature",     habitName: "Walk in Nature",     label: "Walk in nature",                icon: "pine-tree",         defaultTime: "05:00 PM", timeSlot: "evening",   group: "Mindfulness / Self-care" },

  // ---------------- FINANCE & ADMIN ----------------
  { key: "track expenses",   habitName: "Track Expenses",   label: "Track your expenses",      icon: "calculator",         defaultTime: "08:00 PM", timeSlot: "evening",   group: "Finance / Admin" },
  { key: "budget review",    habitName: "Budget Review",    label: "Review your budget",       icon: "chart-line",         defaultTime: "08:30 PM", timeSlot: "evening",   group: "Finance / Admin" },
  { key: "check investments",habitName: "Check Investments",label: "Check your investments",   icon: "finance",            defaultTime: "08:00 PM", timeSlot: "evening",   group: "Finance / Admin" },

  // ---------------- CREATIVE / HOBBIES ----------------
  { key: "photography practice", habitName: "Photography Practice", label: "Practice photography",   icon: "camera",            defaultTime: "05:00 PM", timeSlot: "evening",   group: "Creative / Hobbies" },
  { key: "video editing",        habitName: "Video Editing",        label: "Edit videos",            icon: "video",             defaultTime: "08:00 PM", timeSlot: "evening",   group: "Creative / Hobbies" },
  { key: "gaming",               habitName: "Gaming",               label: "Play video games",       icon: "gamepad-variant",   defaultTime: "09:00 PM", timeSlot: "night",     group: "Creative / Hobbies" },
  { key: "cooking practice",     habitName: "Cooking Practice",     label: "Practice cooking",       icon: "chef-hat",          defaultTime: "07:00 PM", timeSlot: "evening",   group: "Creative / Hobbies" },
  { key: "baking",               habitName: "Baking",               label: "Bake something",         icon: "cupcake",           defaultTime: "03:00 PM", timeSlot: "afternoon", group: "Creative / Hobbies" },
  { key: "gardening",            habitName: "Gardening",            label: "Do gardening",           icon: "flower",            defaultTime: "04:00 PM", timeSlot: "afternoon", group: "Creative / Hobbies" },
  { key: "art practice",         habitName: "Art Practice",         label: "Practice art",           icon: "palette",           defaultTime: "07:00 PM", timeSlot: "evening",   group: "Creative / Hobbies" },

  // ---------------- COMMUTE / ERRANDS ----------------
  { key: "bike to work",    habitName: "Bike to Work",    label: "Commute by bike",           icon: "bike",               defaultTime: "08:00 AM", timeSlot: "morning",   group: "Commute / Errands" },
  { key: "walk to work",    habitName: "Walk to Work",    label: "Walk to work",              icon: "walk",               defaultTime: "08:00 AM", timeSlot: "morning",   group: "Commute / Errands" },
  { key: "public transport",habitName: "Public Transport",label: "Use public transport",      icon: "train",              defaultTime: "08:00 AM", timeSlot: "morning",   group: "Commute / Errands" },

  // ---------------- FAITH / SPIRITUAL ----------------
  { key: "prayer",          habitName: "Prayer",          label: "Prayer time",               icon: "hands-pray",         defaultTime: "09:00 PM", timeSlot: "night",     group: "Faith / Spiritual" },
  { key: "read scripture",  habitName: "Read Scripture",  label: "Read scripture",            icon: "book-cross",         defaultTime: "09:00 PM", timeSlot: "night",     group: "Faith / Spiritual" },
];

(async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/habitsapp");
    for (const h of HABIT_DEFS) {
      await Habit.updateOne({ key: h.key }, { $set: h }, { upsert: true });
    }
    console.log("Seeded predefined habits");
    process.exit(0);
  } catch (e) {
    console.error("Seed error", e);
    process.exit(1);
  }
})();