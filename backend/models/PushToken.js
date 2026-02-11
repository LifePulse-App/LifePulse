import { Schema, model } from 'mongoose';

const pushTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    token:   { type: String, required: true, unique: true, index: true },
    platform:{ type: String, enum: ['android', 'ios'], required: true, index: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default model('PushToken', pushTokenSchema);