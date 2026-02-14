import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    coords: {
      lng: { type: Number, required: true },
      lat: { type: Number, required: true },
    },
    updatedAt: { type: Date, default: Date.now },
    shareMode: { type: String, enum: ["all", "none", "custom"], default: "none" },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // only used if custom
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);