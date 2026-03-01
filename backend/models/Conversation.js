import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ],
    type: { type: String, enum: ["direct"], default: "direct" },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);