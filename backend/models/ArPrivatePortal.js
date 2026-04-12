import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { _id: false });

const arPrivatePortalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  inviteCode: { type: String, unique: true }, // for "invite"-only
  geo: {
    lat: { type: Number },
    lon: { type: Number },
  },
  visibility: { type: String, enum: ["invite", "request"], default: "invite" },
  joinRequests: [joinRequestSchema],
}, { timestamps: true });

export default mongoose.model("ArPrivatePortal", arPrivatePortalSchema);