import Habit from "../models/HabitSchema.js";
import User from "../models/UserSchema.js";
import Proof from "../models/ProofSchema.js";

// Create new habit for current user
export const createHabit = async (req, res) => {
  try {
    const { habitName, icon, label, time } = req.body;

    const habit = await Habit.create({
      user: req.user._id,
      habitName,
      icon,
      label,
      time,
      completions: [], // initialize if using completions
    });

    res.status(201).json({
      success: true,
      habit,
    });
  } catch (error) {
    console.error("Create Habit Error:", error);
    res.status(500).json({ success: false, message: "Failed to create habit" });
  }
};

// List habits for user, with optional search for UI search bar
export const listHabits = async (req, res) => {
  try {
    const userId = req.user._id;
    const search = req.query.search || "";
    const query = { user: userId };
    if (search) {
      // Search on habitName and label (case-insensitive)
      query.$or = [
        { habitName: { $regex: search, $options: "i" } },
        { label: { $regex: search, $options: "i" } },
      ];
    }
    const habits = await Habit.find(query).limit(50);
    res.status(200).json({ success: true, habits });
  } catch (error) {
    console.error("List Habits Error:", error);
    res.status(500).json({ success: false, message: "Failed to list habits" });
  }
};

export const getTodayHabits = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysProofs = await Proof.find({
      user: userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    }).lean();

    const habitIds = todaysProofs.map((p) => p.habitId);

    const habits = await Habit.find({
      _id: { $in: habitIds },
      user: userId,
    }).lean();

    const proofByHabit = todaysProofs.reduce((acc, proof) => {
      acc[proof.habitId.toString()] = proof;
      return acc;
    }, {});

    const result = habits.map((habit) => {
      const proof = proofByHabit[habit._id.toString()];
      let status = "pending";
      if (proof?.status) {
        status = proof.status;
      } else if (proof) {
        status = proof.verified ? "verified" : "pending";
      }
      return {
        id: habit._id.toString(),
        habitName: habit.habitName,
        icon: habit.icon || "check",
        label: habit.label || habit.habitName,
        time: habit.time || "",
        status,
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

    if (!habit.completions) habit.completions = [];
    habit.completions.push({ date: new Date() });
    await habit.save();

    const user = await User.findById(req.user._id);
    user.xp = (user.xp || 0) + 10;
    await user.save();

    res.status(200).json({ success: true, habit, xp: user.xp });
  } catch (error) {
    next(error);
  }
};