import mongoose from "mongoose";

const userHabitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// one user cannot have the same habit assigned twice
userHabitSchema.index({ user: 1, habit: 1 }, { unique: true });

export default mongoose.model("UserHabit", userHabitSchema);