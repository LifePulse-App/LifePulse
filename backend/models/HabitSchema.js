import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    habitName: { type: String, required: true },
    label: { type: String },
    icon: { type: String },
    defaultTime: { type: String },
    timeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      required: true,
    },
    group: { type: String }, // <--- add this
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Habit", habitSchema);