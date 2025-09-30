import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habitName: { type: String, required: true },
});

export default mongoose.model("Habit", habitSchema);
