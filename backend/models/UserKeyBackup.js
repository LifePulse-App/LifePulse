import { Schema, model } from "mongoose";

const userKeyBackupSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },

    // opaque encrypted blob from client
    backupCiphertext: { type: String, required: true },
    backupNonce: { type: String, required: true },
    backupSalt: { type: String, required: true },
    kdf: { type: String, default: "argon2id" },
    kdfParams: { type: Schema.Types.Mixed, default: {} },
    backupVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default model("UserKeyBackup", userKeyBackupSchema);