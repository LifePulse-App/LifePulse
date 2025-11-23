import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    user: {                             // <-- NEW: make habits user-specific
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: { type: String, required: true },
    habitName: { type: String, required: true },
    label: { type: String },
    icon: { type: String },
    defaultTime: { type: String },
    timeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      required: true,
    },
    group: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Habit", habitSchema);