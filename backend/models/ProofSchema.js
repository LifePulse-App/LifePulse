import mongoose from "mongoose";

const proofSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },

  // status: "pending" | "verified" | "rejected"
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },

  // Or your existing flag:
  verified: { type: Boolean, default: false },

}, { timestamps: true });

export default mongoose.model("Proof", proofSchema);