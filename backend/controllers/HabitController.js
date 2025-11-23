import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";

export const getTodayHabits = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1) 24‑hour window: now back to now‑24h
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2) Get this user's proofs in last 24h
    const recentProofs = await Proof.find({
      user: userId,
      createdAt: { $gte: twentyFourHoursAgo, $lte: now },
    }).sort({ createdAt: -1 }); // newest first

    if (!recentProofs.length) {
      return res.json({
        success: true,
        habits: [],
      });
    }

    // 3) Get unique habitIds from these proofs (one habit per user)
    const uniqueHabitIdsSet = new Set(
      recentProofs.map((p) => p.habit.toString())
    );
    const uniqueHabitIds = Array.from(uniqueHabitIdsSet);

    // 4) Fetch those habits from global catalog
    const habits = await Habit.find({
      _id: { $in: uniqueHabitIds },
      active: true,
    });

    // Map for quick lookup
    const habitMap = new Map(
      habits.map((h) => [h._id.toString(), h])
    );

    // 5) Build todayHabits list:
    //    for each unique habitId, find the most recent proof (already sorted),
    //    derive status from that proof, and attach habit info
    const todayHabits = uniqueHabitIds.map((habitId) => {
      const habit = habitMap.get(habitId);
      if (!habit) return null;

      const proofForHabit = recentProofs.find(
        (p) => p.habit.toString() === habitId
      );

      let status= "pending" | "verified" | "rejected";
      if (proofForHabit) {
        if (proofForHabit.status === "verified") status = "verified";
        else if (proofForHabit.status === "rejected") status = "rejected";
        else status = "pending";
      }

      return {
        id: habit._id.toString(),
        icon: habit.icon || null,
        label: habit.label || habit.habitName,
        habitName: habit.habitName,
        time: habit.defaultTime || "",
        status,
      };
    }).filter(Boolean); // remove any nulls (if habit not found)

    return res.json({
      success: true,
      habits: todayHabits,
    });
  } catch (err) {
    console.error("GetTodayHabits error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load today habits" });
  }
};

// List predefined habits (for search & selection)
export const listHabits = async (req, res) => {
  try {
    const search = req.query.search || req.query["params[search]"] || "";
    const query = { active: true }; // no : any
    console.log(search);
    if (search) {
      query.$or = [
        { habitName: { $regex: search, $options: "i" } },
        { label: { $regex: search, $options: "i" } },
      ];
    }

    const habits = await Habit.find(query)
  .select("habitName label icon defaultTime key timeSlot group")
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
  group: h.group,
}));

    res.status(200).json({ success: true, habits: mapped });
  } catch (error) {
    console.error("List Habits Error:", error);
    res.status(500).json({ success: false, message: "Failed to list habits" });
  }
};