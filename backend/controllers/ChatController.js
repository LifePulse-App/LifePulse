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

const allowedTypes = ["text", "image", "video", "document", "audio", "voice"];

const normalizeMessageBody = (body) => {
  const {
    text,
    messageType = "text",
    media = null,
    conversationId,
    receiverId,
    clientMessageId,
    notifyUser = true,
    replyTo,
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
        durationMs: Number(media.durationMs || 0),
        peaks: Array.isArray(media.peaks) ? media.peaks.map(Number) : [],
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
    replyTo,
  };
};

const getPushBody = (msg) => {
  if (msg.messageType === "image") return "sent a Photo";
  if (msg.messageType === "video") return "sent a Video";
  if (msg.messageType === "document") return "sent a Document";
  if (msg.messageType === "audio" || msg.messageType === "voice") return "sent a Voice message";
  return String(msg.text || "");
};

const detectMessageTypeFromMime = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const saveOneFile = async (file, durationMs, peaks) => {
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
    durationMs: Number(durationMs || 0),
    peaks: Array.isArray(peaks) ? peaks.map(Number) : [],
    messageType: detectMessageTypeFromMime(String(file.mimetype || "")),
  };
};

export const uploadChatMedia = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];

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

    const durationMs = Number(req.body?.durationMs || 0);
    let peaks = [];
    if (req.body?.peaks) {
      try {
        peaks = JSON.parse(req.body.peaks);
      } catch {
        peaks = [];
      }
    }

    const uploaded = [];
    for (const f of files) {
      const one = await saveOneFile(f, durationMs, peaks);
      uploaded.push(one);
    }

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
          durationMs: first.durationMs,
          peaks: first.peaks,
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
      replyTo,
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
        replyTo,
        media:
          type === "text"
            ? undefined
            : {
                url: media.url,
                mimeType: media.mimeType,
                size: media.size,
                name: media.name,
                thumbnailUrl: media.thumbnailUrl,
                durationMs: media.durationMs,
                peaks: media.peaks,
              },
        clientMessageId: String(clientMessageId),
      });
      createdNow = true;
    }

    req.io.to(`conversation:${conversationId}`).emit("chat-message", msg);

    if (createdNow && notifyUser && String(senderId) !== String(recvObj)) {
      const fromUsername = req.user?.name || req.user?.username || "Someone";
      await sendMsgNotification(recvObj, senderId, fromUsername, msg._id, getPushBody(msg));
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
    const q = { conversationId: convoObj, deletedForEveryone: { $ne: true } };
    if (beforeRaw) q.createdAt = { $lt: new Date(String(beforeRaw)) };

    const messages = await ChatMessage.find(q)
      .populate("replyTo", "text messageType media senderId")
      .sort({ createdAt: -1 }) 
      .limit(limit)
      .lean();
      
    res.json({ messages: messages.reverse() });
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

    // ⚡ FIX 1: Fetch clientMessageId so the frontend knows exactly which local message to double-tick
    const msgs = await ChatMessage.find({
      _id: { $in: ids },
      receiverId: me,
      deliveredAt: null,
    })
      .select("_id senderId receiverId conversationId clientMessageId") 
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

    // ⚡ FIX 2: Emit the payload with exact matching IDs to both the convo room AND the sender's direct room
    for (const msg of msgs) {
      const payload = {
        msgId: String(msg._id),
        clientMessageId: msg.clientMessageId || null,
        userId: String(me),
        conversationId: String(msg.conversationId)
      };

      // Emit to conversation
      req.io.to(`conversation:${msg.conversationId}`).emit("msg-delivered", payload);
      
      // GUARANTEE emit directly to sender
      req.io.to(String(msg.senderId)).emit("msg-delivered", payload);
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

    // ⚡ FIX: Emit to both convo room AND sender directly
    const payload = {
      msgId: lastSeenMessageId,
      userId: String(me),
      conversationId: String(conversationId)
    };

    req.io.to(`conversation:${conversationId}`).emit("msg-seen", payload);
    req.io.to(String(peerObj)).emit("msg-seen", payload);

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
        else if (last.messageType === "voice" || last.messageType === "audio") lastText = "🎤 Voice message";
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
    })
      .select("_id senderId conversationId clientMessageId") // ⚡ FIX 1: Add clientMessageId
      .lean();

    if (!pending.length) return res.json({ success: true, count: 0 });

    const ids = pending.map((m) => m._id);

    await ChatMessage.updateMany(
      { _id: { $in: ids }, receiverId: me, deliveredAt: null },
      { $set: { deliveredAt: new Date() } }
    );

    // ⚡ FIX 2: Emit to both convo room AND direct sender room
    for (const msg of pending) {
      const payload = {
        msgId: String(msg._id),
        clientMessageId: msg.clientMessageId || null,
        userId: String(me),
        conversationId: String(msg.conversationId)
      };

      req.io.to(`conversation:${msg.conversationId}`).emit("msg-delivered", payload);
      req.io.to(String(msg.senderId)).emit("msg-delivered", payload);
    }

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

export const reactToMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId, emoji } = req.body;
    if (!messageId || !emoji) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isParticipant =
      String(msg.senderId) === String(me) || String(msg.receiverId) === String(me);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(me));

    msg.reactions.push({
      userId: me,
      emoji,
      reactedAt: new Date(),
    });

    await msg.save();

    req.io.to(`conversation:${msg.conversationId}`).emit("msg-reacted", {
      msgId: String(msg._id),
      userId: String(me),
      emoji,
    });

    res.json({ success: true, reactions: msg.reactions });
  } catch (e) {
    console.error("[chat] reactToMessage error", e);
    res.status(500).json({ message: "Internal error" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isParticipant =
      String(msg.senderId) === String(me) || String(msg.receiverId) === String(me);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(me));

    await msg.save();

    req.io.to(`conversation:${msg.conversationId}`).emit("msg-reacted", {
      msgId: String(msg._id),
      userId: String(me),
      emoji: null,
    });

    res.json({ success: true, reactions: msg.reactions });
  } catch (e) {
    console.error("[chat] removeReaction error", e);
    res.status(500).json({ message: "Internal error" });
  }
};

export const deleteForEveryone = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (String(msg.senderId) !== String(me)) {
      return res.status(403).json({ message: "Only sender can delete this message" });
    }

    msg.deletedForEveryone = true;
    await msg.save();

    req.io.to(`conversation:${msg.conversationId}`).emit("msg-deleted", {
      msgId: String(msg._id),
    });

    res.json({ success: true });
  } catch (e) {
    console.error("[chat] deleteForEveryone error", e);
    res.status(500).json({ message: "Internal error" });
  }
};

export const markListened = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "messageId required" });
    }

    const msg = await ChatMessage.findById(messageId);

    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(msg.receiverId) !== String(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (msg.messageType !== "audio" && msg.messageType !== "voice") {
      return res.status(400).json({ message: "Only audio/voice messages can be marked listened" });
    }

    msg.listenedAt = new Date();
    await msg.save();

    req.io.to(`conversation:${msg.conversationId}`).emit("msg-listened", {
      msgId: String(msg._id),
      userId: String(me),
      listenedAt: msg.listenedAt,
    });

    res.json({
      success: true,
      messageId: msg._id,
      listenedAt: msg.listenedAt,
    });
  } catch (err) {
    console.error("[chat] markListened error", err);
    res.status(500).json({ message: "Internal error" });
  }
};