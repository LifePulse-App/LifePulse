import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'hate_speech', 'other'],
    required: true,
  },
  details: { type: String, maxlength: 500 },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);