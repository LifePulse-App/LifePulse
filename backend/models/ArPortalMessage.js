import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const arPortalMessageSchema = new mongoose.Schema(
  {
    spotId: { type: mongoose.Schema.Types.ObjectId, ref: "ArPortalSpot", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    text: { type: String, default: "" },
    media: {
      url: String,
      mimeType: String,
      size: Number,
      name: Number,
      thumbnailUrl: String,
      duration: Number,
    },
    messageType: { type: String, enum: ["text", "image", "video", "sticker"], default: "text" },

    // REAL PINNING (each message pinned at a specific point)
  anchor: {
  type: {
    type: String,
    enum: ["arcore_cloud"],
    default: "arcore_cloud",
  },
  cloudAnchorId: { type: String, required: false }, // <-- was true
},
// Ensure your message model has these fields (required for delete to work):
isDeleted: { type: Boolean, default: false },
deletedAt: { type: Date },

    reactions: [reactionSchema],
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

arPortalMessageSchema.index({ spotId: 1, createdAt: 1 });
export default mongoose.model("ArPortalMessage", arPortalMessageSchema);