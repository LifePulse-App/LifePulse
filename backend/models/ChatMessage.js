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

    // text is optional now (for media-only message)
    text: { type: String, default: "" },

    // NEW
    messageType: {
      type: String,
      enum: ["text", "image", "video", "document"],
      default: "text",
      index: true,
    },

    media: {
      url: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      name: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
      duration: { type: Number, default: 0 },
    },

    clientMessageId: { type: String, required: true, index: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);