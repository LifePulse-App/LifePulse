import mongoose from "mongoose";

const e2eeDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    deviceId: { type: String, required: true, index: true }, // unique per device
    identityPub: { type: String, required: true },
    signedPrekeyPub: { type: String, required: true },
    signedPrekeySig: { type: String, required: true },
    oneTimePrekeys: [
      {
        keyId: { type: String, required: true },
        pubKey: { type: String, required: true },
        used: { type: Boolean, default: false },
      },
    ],
    lastPrekeyRefresh: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

e2eeDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model("E2EEDevice", e2eeDeviceSchema);