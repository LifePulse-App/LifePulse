import mongoose from "mongoose";

const proofSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habit: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
  imageUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['submitted', 'verified', 'rejected'],
    default: 'submitted'
  },
  points: { type: Number, default: 1 },
  aiScore: Number, // returned by model
}, { timestamps: true });

export default mongoose.model("Proof", proofSchema);