import { Schema, model } from "mongoose";

const e2eeMessageSchema = new Schema(
  {
    toUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    toDeviceId: { type: String, index: true, required: true },

    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromDeviceId: { type: String, required: true },

    // ✅ required to decrypt correctly
    fromSignalDeviceId: { type: Number, required: true },

    sessionId: { type: String, required: true },
    header: { type: Schema.Types.Mixed, required: true },
    ciphertext: { type: String, required: true },

    delivered: { type: Boolean, default: false, index: true },
    deliveredAt: { type: Date },
    seenAt: { type: Date },
  },
  { timestamps: true }
);

e2eeMessageSchema.index(
  { toUserId: 1, toDeviceId: 1, delivered: 1, createdAt: 1 },
  { name: "toUser_toDevice_delivered_createdAt" }
);

export default model("E2EEMessage", e2eeMessageSchema, "e2eeMessages");