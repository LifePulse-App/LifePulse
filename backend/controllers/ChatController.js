import mongoose from "mongoose";
import fs from "fs";
import os from "os";
import path from "path";

import ChatMessage from "../models/ChatMessage.js";
import Conversation from "../models/Conversation.js";
import Mood from "../models/MoodSchema.js";
import { sendMsgNotification, sendSeenNotification } from "./NotificationController.js";
import { sendDeliveredNotification } from "./NotificationController.js";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB each

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

const allowedTypes = ["text", "image", "video", "document"];

const normalizeMessageBody = (body) => {
  const {
    text,
    messageType = "text",
    media = null,
    conversationId,
    receiverId,
    clientMessageId,
    notifyUser = true,
  } = body || {};

  const type = allowedTypes.includes(String(messageType)) ? String(messageType) : "text";
  const safeText = String(text || "").trim();

  const safeMedia = media
    ? {
        url: String(media.url || ""),
        mimeType: String(media.mimeType || ""),
        size: Number(media.size || 0),
        name: String(media.name || ""),
        thumbnailUrl: String(media.thumbnailUrl || ""),
        duration: Number(media.duration || 0),
      }
    : null;

  return {
    type,
    text: safeText,
    media: safeMedia,
    conversationId,
    receiverId,
    clientMessageId,
    notifyUser,
  };
};

const getPushBody = (msg) => {
  if (msg.messageType === "image") return "📷 Photo";
  if (msg.messageType === "video") return "🎥 Video";
  if (msg.messageType === "document") return "📎 Document";
  return String(msg.text || "");
};

const detectMessageTypeFromMime = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
};

const saveOneFile = async (file) => {
  const HOME_DIR = os.homedir();
  const CHAT_DIR = path.join(HOME_DIR, "uploads", "chat");
  await fs.promises.mkdir(CHAT_DIR, { recursive: true });

  const ext = path.extname(file.originalname || "") || "";
  const safeBase = (file.originalname || "file")
    .replace(ext, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeBase}${ext}`;
  const filePath = path.join(CHAT_DIR, fileName);

  await fs.promises.writeFile(filePath, file.buffer);

  return {
    url: `/chat-media/${fileName}`,
    mimeType: String(file.mimetype || ""),
    size: Number(file.size || 0),
    name: String(file.originalname || fileName),
    thumbnailUrl: "",
    duration: 0,
    messageType: detectMessageTypeFromMime(String(file.mimetype || "")),
  };
};

export const uploadChatMedia = async (req, res) => {
  try {
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
      ? [req.file]
      : [];

    if (!files.length) {
      return res.status(400).json({ message: "file(s) is required" });
    }

    if (files.length > MAX_FILES) {
      return res.status(400).json({ message: `You can upload maximum ${MAX_FILES} files at once` });
    }

    for (const f of files) {
      if (Number(f.size || 0) > MAX_FILE_SIZE) {
        return res.status(400).json({
          message: `Each file must be <= ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`,
        });
      }
    }

    const uploaded = [];
    for (const f of files) {
      const one = await saveOneFile(f);
      uploaded.push(one);
    }

    // backward compatibility for old single-file frontend
    if (uploaded.length === 1) {
      const first = uploaded[0];
      return res.status(200).json({
        success: true,
        messageType: first.messageType,
        media: {
          url: first.url,
          mimeType: first.mimeType,
          size: first.size,
          name: first.name,
          thumbnailUrl: first.thumbnailUrl,
          duration: first.duration,
        },
        files: uploaded,
      });
    }

    return res.status(200).json({
      success: true,
      files: uploaded,
      count: uploaded.length,
    });
  } catch (err) {
    console.error("[chat] uploadChatMedia error", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};

// ----- your existing exports below (unchanged) -----
export const openDirectConversation = async (req, res) => {
  try {
    const me = req.user._id;
    const peerUserId = req.params.peerUserId;
    const peerObj = toObjectId(peerUserId);
    if (!peerObj) return res.status(400).json({ message: "Invalid peerUserId" });

    let convo = await Conversation.findOne({
      type: "direct",
      participants: { $all: [me, peerObj], $size: 2 },
    });

    if (!convo) {
      convo = await Conversation.create({
        type: "direct",
        participants: [me, peerObj],
      });
    }

    res.json({ conversation: convo });
  } catch (err) {
    console.error("[chat] openDirectConversation error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;

    const {
      type,
      text,
      media,
      conversationId,
      receiverId,
      clientMessageId,
      notifyUser,
    } = normalizeMessageBody(req.body);

    if (!conversationId || !receiverId || !clientMessageId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (type === "text" && !text) {
      return res.status(400).json({ message: "Text is required for text message" });
    }

    if (type !== "text" && (!media || !media.url)) {
      return res.status(400).json({ message: "Media url is required for media message" });
    }

    const convoObj = toObjectId(conversationId);
    const recvObj = toObjectId(receiverId);
    if (!convoObj || !recvObj) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const convo = await Conversation.findById(convoObj).lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const isMember =
      convo.participants.some((p) => String(p) === String(senderId)) &&
      convo.participants.some((p) => String(p) === String(recvObj));
    if (!isMember) return res.status(403).json({ message: "Not a participant" });

    let msg = await ChatMessage.findOne({
      conversationId: convoObj,
      senderId,
      clientMessageId: String(clientMessageId),
    });

    let createdNow = false;
    if (!msg) {
      msg = await ChatMessage.create({
        conversationId: convoObj,
        senderId,
        receiverId: recvObj,
        text: type === "text" ? String(text) : String(text || ""),
        messageType: type,
        media:
          type === "text"
            ? undefined
            : {
                url: media.url,
                mimeType: media.mimeType,
                size: media.size,
                name: media.name,
                thumbnailUrl: media.thumbnailUrl,
                duration: media.duration,
              },
        clientMessageId: String(clientMessageId),
      });
      createdNow = true;
    }

    if (createdNow && notifyUser && String(senderId) !== String(recvObj)) {
      const fromUsername = req.user?.name || req.user?.username || "Someone";
      await sendMsgNotification(
        recvObj,
        senderId,
        fromUsername,
        msg._id,
        getPushBody(msg)
      );
    }

    res.json({
      success: true,
      message: msg,
      serverAcceptedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[chat] sendMessage error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const getThread = async (req, res) => {
  try {
    const me = req.user._id;
    const conversationId = req.params.conversationId;
    const limitRaw = req.query.limit || "50";
    const beforeRaw = req.query.before;

    const convoObj = toObjectId(conversationId);
    if (!convoObj) return res.status(400).json({ message: "Invalid conversationId" });

    const convo = await Conversation.findById(convoObj).lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });
    const isMember = convo.participants.some((p) => String(p) === String(me));
    if (!isMember) return res.status(403).json({ message: "Not a participant" });

    const limit = Math.min(parseInt(String(limitRaw), 10), 200);
    const q = { conversationId: convoObj };
    if (beforeRaw) q.createdAt = { $lt: new Date(String(beforeRaw)) };

    const messages = await ChatMessage.find(q).sort({ createdAt: 1 }).limit(limit).lean();
    res.json({ messages });
  } catch (err) {
    console.error("[chat] getThread error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const markDelivered = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || !messageIds.length) {
      return res.status(400).json({ message: "messageIds required" });
    }

    const ids = messageIds.map((id) => toObjectId(id)).filter(Boolean);

    const msgs = await ChatMessage.find({
      _id: { $in: ids },
      receiverId: me,
      deliveredAt: null,
    })
      .select("_id senderId receiverId")
      .lean();

    if (!msgs.length) {
      return res.json({ success: true, count: 0 });
    }

    const msgIdsToUpdate = msgs.map((m) => m._id);

    await ChatMessage.updateMany(
      { _id: { $in: msgIdsToUpdate }, receiverId: me, deliveredAt: null },
      { $set: { deliveredAt: new Date() } }
    );

    const bySender = new Map();
    for (const m of msgs) {
      const s = String(m.senderId);
      if (!bySender.has(s)) bySender.set(s, []);
      bySender.get(s).push(String(m._id));
    }

    for (const [senderId, deliveredMsgIds] of bySender.entries()) {
      await sendDeliveredNotification(senderId, me, deliveredMsgIds);
    }

    res.json({ success: true, count: msgIdsToUpdate.length });
  } catch (err) {
    console.error("[chat] markDelivered error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const markSeen = async (req, res) => {
  try {
    const me = req.user._id;
    const { conversationId, peerUserId, lastSeenMessageId } = req.body;

    const convoObj = toObjectId(conversationId);
    const peerObj = toObjectId(peerUserId);
    const lastObj = toObjectId(lastSeenMessageId);
    if (!convoObj || !peerObj || !lastObj) {
      return res.status(400).json({ message: "Invalid fields" });
    }

    const lastMsg = await ChatMessage.findById(lastObj).lean();
    if (!lastMsg) return res.status(404).json({ message: "Message not found" });

    if (String(lastMsg.conversationId) !== String(convoObj)) {
      return res.status(400).json({ message: "Message not in conversation" });
    }

    const upd = await ChatMessage.updateMany(
      {
        conversationId: convoObj,
        senderId: peerObj,
        receiverId: me,
        createdAt: { $lte: lastMsg.createdAt },
        seenAt: null,
      },
      { $set: { seenAt: new Date() } }
    );

    const changed = upd.modifiedCount ?? upd.nModified ?? 0;
    if (changed > 0) {
      await sendSeenNotification(peerObj, me);
    }

    res.json({ success: true, count: changed });
  } catch (err) {
    console.error("[chat] markSeen error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const listConversationPreviews = async (req, res) => {
  try {
    const me = req.user._id;

    const convos = await Conversation.find({
      type: "direct",
      participants: me,
    }).lean();

    const out = [];
    for (const c of convos) {
      const peer = c.participants.find((p) => String(p) !== String(me));
      if (!peer) continue;

      const last = await ChatMessage.findOne({ conversationId: c._id })
        .sort({ createdAt: -1 })
        .lean();

      const unread = await ChatMessage.countDocuments({
        conversationId: c._id,
        receiverId: me,
        seenAt: null,
      });

      const moodDoc = await Mood.findOne({ user: peer }).sort({ createdAt: -1 }).lean();

      let lastText = "";
      if (last) {
        if (last.messageType === "image") lastText = "📷 Photo";
        else if (last.messageType === "video") lastText = "🎥 Video";
        else if (last.messageType === "document") lastText = "📎 Document";
        else lastText = last.text || "";
      }

      out.push({
        conversationId: c._id,
        peerUserId: peer,
        lastText,
        lastAt: last?.createdAt || c.updatedAt,
        unread,
        mood: moodDoc?.mood || "",
      });
    }

    out.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    res.json({ conversations: out });
  } catch (err) {
    console.error("[chat] listConversationPreviews error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const markDeliveredAll = async (req, res) => {
  try {
    const me = req.user._id;

    const pending = await ChatMessage.find({
      receiverId: me,
      deliveredAt: null,
    }).select("_id senderId").lean();

    if (!pending.length) return res.json({ success: true, count: 0 });

    const ids = pending.map((m) => m._id);

    await ChatMessage.updateMany(
      { _id: { $in: ids }, receiverId: me, deliveredAt: null },
      { $set: { deliveredAt: new Date() } }
    );

    const bySender = new Map();
    for (const m of pending) {
      const s = String(m.senderId);
      if (!bySender.has(s)) bySender.set(s, []);
      bySender.get(s).push(String(m._id));
    }

    for (const [senderId, messageIds] of bySender.entries()) {
      await sendDeliveredNotification(senderId, me, messageIds);
    }

    return res.json({ success: true, count: ids.length });
  } catch (e) {
    console.error("[chat] markDeliveredAll error", e);
    return res.status(500).json({ message: "Internal error" });
  }
};