import express from "express";
import multer from "multer";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  openDirectConversation,
  sendMessage,
  getThread,
  markDelivered,
  markSeen,
  listConversationPreviews,
  markDeliveredAll,
  uploadChatMedia,
} from "../controllers/ChatController.js";

const router = express.Router();

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB each

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    const okMime =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed";

    if (!okMime) return cb(new Error("Unsupported file type"));
    cb(null, true);
  },
});

router.post("/conversations/direct/:peerUserId/open", isAuthenticatedUser, openDirectConversation);
router.get("/conversations/previews", isAuthenticatedUser, listConversationPreviews);

router.post("/messages", isAuthenticatedUser, sendMessage);
router.get("/messages/thread/:conversationId", isAuthenticatedUser, getThread);
router.patch("/messages/delivered", isAuthenticatedUser, markDelivered);
router.patch("/messages/seen", isAuthenticatedUser, markSeen);
router.post("/messages/mark-delivered-all", isAuthenticatedUser, markDeliveredAll);

// single file (existing compatibility)
router.post("/messages/upload", isAuthenticatedUser, upload.single("file"), uploadChatMedia);

// multi file (new): field name files[]
router.post("/messages/upload-multiple", isAuthenticatedUser, upload.array("files", MAX_FILES), uploadChatMedia);

export default router;