import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const arPrivatePortalMessageSchema = new mongoose.Schema(
  {
    portalId: { type: mongoose.Schema.Types.ObjectId, ref: "ArPrivatePortal", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    media: {
      url: String,
      mimeType: String,
      size: Number,
      name: String,
      thumbnailUrl: String,
      duration: Number,
    },
    messageType: { type: String, enum: ["text", "image", "video", "sticker"], default: "text" },
    geo: {
      lat: { type: Number },
      lon: { type: Number },
    },
    reactions: [reactionSchema],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("ArPrivatePortalMessage", arPrivatePortalMessageSchema);