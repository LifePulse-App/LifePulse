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

    text: { type: String, required: true },

    clientMessageId: { type: String, required: true, index: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);