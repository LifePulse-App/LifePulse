import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "drink_water"
    habitName: { type: String, required: true },         // "Drink Water"
    label: { type: String },                             // "Drink a glass of water"
    icon: { type: String },                              // "cup", "book-open-page-variant", etc.
    defaultTime: { type: String },                       // "08:00 AM"
    timeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Habit", habitSchema);