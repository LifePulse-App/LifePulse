import { Schema, model } from "mongoose";

const conversationKeyEnvelopeSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    epoch: { type: Number, required: true, index: true },

    // owner of device receiving this wrapped key
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true, index: true },

    // wrapped conversation key (encrypted to device)
    wrappedKey: { type: String, required: true },
    wrapAlg: { type: String, default: "x25519+aesgcm" },

    // optional metadata
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

conversationKeyEnvelopeSchema.index(
  { conversationId: 1, epoch: 1, userId: 1, deviceId: 1 },
  { unique: true, name: "uniq_envelope_per_device_per_epoch" }
);

export default model("ConversationKeyEnvelope", conversationKeyEnvelopeSchema);