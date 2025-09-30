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


export const getHabits = async (req, res, next) => {
  try {
    const habits = await Habit.find({ user: req.user._id });
    res.status(200).json({ success: true, habits });
  } catch (error) {
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
