import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deletedForEveryone: { type: Boolean, default: false },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
        reactedAt: { type: Date, default: Date.now },
      },
    ],
    text: { type: String, default: "" },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "document", "audio", "voice"],
      default: "text",
      index: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    media: {
      url: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      name: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
      // FIX: renamed from `duration` -> `durationMs` to match frontend (was always saved as 0)
      durationMs: { type: Number, default: 0 },
      // FIX: peaks were uploaded by client + returned by uploadChatMedia but never persisted
      peaks: { type: [Number], default: [] },
    },
    clientMessageId: { type: String, required: true, index: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    listenedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);