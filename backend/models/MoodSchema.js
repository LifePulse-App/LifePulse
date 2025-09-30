import mongoose from "mongoose";

const moodSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mood: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Mood", moodSchema);
