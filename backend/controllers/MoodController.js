import Mood from "../models/MoodSchema.js";
import User from "../models/UserSchema.js";

// POST /api/moods
// body: { mood: string }
export const createMood = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { mood } = req.body;

    if (!mood) {
      return res
        .status(400)
        .json({ success: false, message: "Mood is required" });
    }

    // ensure user exists
    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const moodDoc = await Mood.create({
      user: userId,
      mood,
    });

    return res.status(201).json({
      success: true,
      message: "Mood logged successfully",
      data: {
        id: moodDoc._id,
        mood: moodDoc.mood,
        createdAt: moodDoc.createdAt,
      },
    });
  } catch (err) {
    console.error("Error creating mood:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to log mood" });
  }
};