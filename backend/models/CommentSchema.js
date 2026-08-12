// models/CommentSchema.js
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Proof", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    // Self-referencing field for nested replies (null if it's a top-level comment)
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    
    text: { type: String, required: true, maxLength: 500 },
    
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// We add an index to quickly pull comments for a specific post
CommentSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model("Comment", CommentSchema);