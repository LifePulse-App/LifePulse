import { Schema, model } from "mongoose";

const e2eeDeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    deviceId: { type: String, index: true },            // string device id (e.g., DeviceInfo.getUniqueIdSync())
    registrationId: { type: Number, required: true },   // numeric Signal registration id
    identityPub: String,
    signedPrekeyPub: String,
    signedPrekeySig: String,
    signedPrekeyId: { type: Number, default: 1 },
    oneTimePrekeys: [
      {
        keyId: Number,
        pubKey: String,
      },
    ],
    lastPrekeyRefresh: Date,
  },
  { timestamps: true }
);

E2EEDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default model("e2eeDevice", e2eeDeviceSchema);