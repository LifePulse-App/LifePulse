// controllers/habitController.js
import Habit from "../models/HabitSchema.js";
import User from "../models/UserSchema.js";
import Proof from "../models/ProofSchema.js";

export const createHabit = async (req, res) => {
  try {
    const { habitName } = req.body;

    // Step 1: Create Habit
    const habit = await Habit.create({
      user: req.user._id,
      habitName,
    });

    // Step 2: Create Proof linked to Habit
    const proof = await Proof.create({
      user: req.user._id,
      habitId: habit._id, // Link habit here
      verified: false,  // default
    });

    // Step 3: Send response
    res.status(201).json({
      success: true,
      habit,
      proof,
    });
  } catch (error) {
    console.error("Create Habit Error:", error);
    res.status(500).json({ success: false, message: "Failed to create habit" });
  }
};


export const getTodayHabits = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Start & end of "today"
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Find proofs created today for this user
    const todaysProofs = await Proof.find({
      user: userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    }).lean();

    const habitIds = todaysProofs.map((p) => p.habitId);

    // Get the matching habits
    const habits = await Habit.find({
      _id: { $in: habitIds },
      user: userId,
    }).lean();

    // Build map habitId -> proof
    const proofByHabit = todaysProofs.reduce((acc, proof) => {
      acc[proof.habitId.toString()] = proof;
      return acc;
    }, {});

    const result = habits.map((habit) => {
      const proof = proofByHabit[habit._id.toString()];

      // Normalize status
      let status = "pending";
      if (proof?.status) {
        status = proof.status; // "pending" | "verified" | "rejected"
      } else if (proof) {
        // Fallback if you only have `verified` flag
        status = proof.verified ? "verified" : "pending";
      }

      return {
        id: habit._id.toString(),
        habitName: habit.habitName,
        icon: habit.icon || "check",     // default icon if not set
        label: habit.label || habit.habitName,
        time: habit.time || "",

        status, // "pending" | "verified" | "rejected"
      };
    });

    return res.status(200).json({
      success: true,
      habits: result,
    });
  } catch (error) {
    console.error("Get Today Habits Error:", error);
    next(error);
  }
};

export const updateHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOneAndUpdate(
      { _id: id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
    res.status(200).json({ success: true, habit });
  } catch (error) {
    next(error);
  }
};

export const deleteHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOneAndDelete({ _id: id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
    res.status(200).json({ success: true, message: "Habit deleted" });
  } catch (error) {
    next(error);
  }
};

export const completeHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOne({ _id: id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });

    habit.completions.push({ date: new Date() });
    await habit.save();

    const user = await User.findById(req.user._id);
    user.xp += 10;
    await user.save();

    res.status(200).json({ success: true, habit, xp: user.xp });
  } catch (error) {
    next(error);
  }
};
