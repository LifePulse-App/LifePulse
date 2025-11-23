import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";

export const getTodayHabits = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1) Compute today's date range (00:00–23:59)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // 2) Get all active habits (global catalog)
    // If you later want per-timeslot: filter by `timeSlot`
    const habits = await Habit.find({ active: true }).sort({ createdAt: 1 });

    // 3) For each habit, find today's proof for this user
    const todayHabits = await Promise.all(
      habits.map(async (habit) => {
        const todayProof = await Proof.findOne({
          user: userId,
          habit: habit._id,
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        }).sort({ createdAt: -1 });

        let status= "pending" | "verified" | "rejected";
        if (todayProof) {
          if (todayProof.status === "verified") status = "verified";
          else if (todayProof.status === "rejected") status = "rejected";
          else status = "pending"
        }

        return {
          id: habit._id.toString(),
          icon: habit.icon || null,
          label: habit.label || habit.habitName,
          habitName: habit.habitName,
          time: habit.defaultTime || "",
          status,
        };
      })
    );

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