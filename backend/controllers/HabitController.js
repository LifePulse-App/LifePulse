import Habit from "../models/HabitSchema.js";
import Proof from "../models/ProofSchema.js";

export const getTodayHabits = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1) Today’s date range: 00:00 → 23:59:59
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1); // tomorrow 00:00

    // 2) Get this user's proofs for today
    const todayProofs = await Proof.find({
      user: userId,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }).sort({ createdAt: -1 }); // newest first

    if (!todayProofs.length) {
      return res.json({
        success: true,
        habits: [],
      });
    }

    // 3) Unique habitIds from these proofs (one habit per type)
    const uniqueHabitIds = [
      ...new Set(todayProofs.map((p) => p.habit.toString())),
    ];

    // 4) Fetch those habits from global catalog
    const habits = await Habit.find({
      _id: { $in: uniqueHabitIds },
      active: true,
    });

    const habitMap = new Map(habits.map((h) => [h._id.toString(), h]));

    // 5) Build todayHabits list
    const todayHabits = uniqueHabitIds
      .map((habitId) => {
        const habit = habitMap.get(habitId);
        if (!habit) return null;

        const proofForHabit = todayProofs.find(
          (p) => p.habit.toString() === habitId
        );

        let status= "pending" | "verified" | "rejected";
        if (proofForHabit) {
          if (proofForHabit.status === "verified") status = "verified";
          else if (proofForHabit.status === "rejected") status = "rejected";
        }

        const timeFromProof = proofForHabit?.timeSlotAtProof || "";

        return {
          id: habit._id.toString(),
          icon: habit.icon || null,
          label: habit.label || habit.habitName,
          habitName: habit.habitName,
          time: timeFromProof || "",
          status,
        };
      })
      .filter(Boolean);

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