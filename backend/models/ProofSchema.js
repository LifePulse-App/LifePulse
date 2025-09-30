import mongoose from "mongoose";

const proofSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Proof", proofSchema);
