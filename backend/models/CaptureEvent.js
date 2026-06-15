import mongoose from "mongoose";

const CaptureEventSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    type: {
      type: String,
      enum: ["screenshot", "screen_recording"],
      required: true,
    },
  },
  { timestamps: true }
);

CaptureEventSchema.index({ conversationId: 1, createdAt: 1 });
CaptureEventSchema.index({ capturedBy: 1, conversationId: 1, createdAt: 1 });

export default mongoose.model("CaptureEvent", CaptureEventSchema);