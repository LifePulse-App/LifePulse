import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";

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

    const habitIds = todaysProofs.map((p) => p.habit);

    const habits = await Habit.find({
      _id: { $in: habitIds },
      active: true,
    }).lean();

    // plain JS object, no TS cast
    const proofByHabit = todaysProofs.reduce((acc, proof) => {
      acc[proof.habit.toString()] = proof;
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
        time: habit.defaultTime || "",
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

// List predefined habits (for search & selection)
export const listHabits = async (req, res) => {
  try {
    const search = req.query.search || "";
    const query = { active: true }; // no : any

    if (search) {
      query.$or = [
        { habitName: { $regex: search, $options: "i" } },
        { label: { $regex: search, $options: "i" } },
      ];
    }

    const habits = await Habit.find(query)
      .select("habitName label icon defaultTime key timeSlot")
      .limit(200)
      .lean();

    const mapped = habits.map((h) => ({
      id: h._id.toString(),
      habitName: h.habitName,
      label: h.label,
      icon: h.icon,
      time: h.defaultTime,
      key: h.key,
      timeSlot: h.timeSlot,
    }));

    res.status(200).json({ success: true, habits: mapped });
  } catch (error) {
    console.error("List Habits Error:", error);
    res.status(500).json({ success: false, message: "Failed to list habits" });
  }
};