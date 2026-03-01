import { Schema, model } from "mongoose";

const messageReceiptSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    readerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    peerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // monotonic checkpoint for blue ticks
    lastSeenMessageId: { type: Schema.Types.ObjectId, required: true },
    seenAt: { type: Date, required: true },
  },
  { timestamps: true }
);

messageReceiptSchema.index(
  { conversationId: 1, readerUserId: 1, peerUserId: 1 },
  { unique: true, name: "uniq_receipt_checkpoint" }
);

export default model("MessageReceipt", messageReceiptSchema);