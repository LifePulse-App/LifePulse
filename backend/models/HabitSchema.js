import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habitName: { type: String, required: true },

  // OPTIONAL but recommended for your UI:
  icon: { type: String },          // e.g. "book", "dumbbell"
  label: { type: String },         // display label
  time: { type: String },          // "7:00 AM"
}, { timestamps: true });

export default mongoose.model("Habit", habitSchema);