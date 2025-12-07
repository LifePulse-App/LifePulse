import mongoose from "mongoose";

const e2eeMessageSchema = new mongoose.Schema(
  {
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    toDeviceId: { type: String, index: true, required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromDeviceId: { type: String, required: true },
    sessionId: { type: String, required: true },   // sender-side session identifier
    header: { type: Object, required: true },      // ratchet header
    ciphertext: { type: String, required: true },  // base64
    delivered: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

e2eeMessageSchema.index({ toUserId: 1, toDeviceId: 1, delivered: 1 });

export default mongoose.model("E2EEMessage", e2eeMessageSchema);