import { Schema, model } from "mongoose";

const e2eeDeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    deviceId: { type: String, index: true, required: true },
    registrationId: { type: Number, required: true },
    identityPub: { type: String, required: true },
    signedPrekeyPub: { type: String, required: true },
    signedPrekeySig: { type: String, required: true },
    signedPrekeyId: { type: Number, default: 1 },
    oneTimePrekeys: [
      {
        keyId: { type: Number, required: true },
        pubKey: { type: String, required: true },
      },
    ],
    lastPrekeyRefresh: { type: Date },
  },
  { timestamps: true }
);

e2eeDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default model("E2EEDevice", e2eeDeviceSchema, "e2eeDevices");