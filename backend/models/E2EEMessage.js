import { Schema, model } from "mongoose";

const e2eeMessageSchema = new Schema(
  {
    toUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    toDeviceId: { type: String, index: true },   // string device id (matches deviceId in E2EEDevice)
    fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
    fromDeviceId: { type: String },
    sessionId: String,
    header: Schema.Types.Mixed,
    ciphertext: String,
    delivered: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default model("e2eeMessage", e2eeMessageSchema);