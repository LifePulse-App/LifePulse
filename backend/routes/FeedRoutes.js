import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { 
  getFeed, 
  toggleLikePost, 
  addComment, 
  getComments, 
  deleteComment, 
  deletePost, 
  toggleLikeComment,
  getUserPosts
} from "../controllers/ActivityFeedController.js";
import { reportPost } from "../controllers/ModerationController.js";

const router = express.Router();

// Fetch Feed
router.get("/", isAuthenticatedUser, getFeed);
router.get("/user/:userId/posts", isAuthenticatedUser, getUserPosts);

// Post Actions
router.post("/post/:postId/like", isAuthenticatedUser, toggleLikePost);
router.delete("/post/:postId", isAuthenticatedUser, deletePost);

// Comments Actions
router.get("/post/:postId/comments", isAuthenticatedUser, getComments);
router.post("/post/:postId/comments", isAuthenticatedUser, addComment);
router.delete("/comment/:commentId", isAuthenticatedUser, deleteComment);

// (Optional) Like a comment API could go here
 router.post("/comment/:commentId/like", isAuthenticatedUser, toggleLikeComment);

 router.post("/posts/:postId/report", isAuthenticatedUser, reportPost);

export default router;