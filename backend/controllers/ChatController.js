import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
import Conversation from "../models/Conversation.js";
import Mood from "../models/MoodSchema.js";
import { sendMsgNotification, sendSeenNotification } from "./NotificationController.js";

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
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
    const { conversationId, receiverId, text, clientMessageId, notifyUser = true } = req.body;

    if (!conversationId || !receiverId || !text || !clientMessageId) {
      return res.status(400).json({ message: "Missing fields" });
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

    // idempotent write (important for retries)
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
        text: String(text),
        clientMessageId: String(clientMessageId),
      });
      createdNow = true;
    }

    // send push only on fresh create, not on retry/idempotent hit
if (createdNow && notifyUser && String(senderId) !== String(recvObj)) {
      const fromUsername = req.user?.name || req.user?.username || "Someone";
      await sendMsgNotification(recvObj, senderId, fromUsername);
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

    await ChatMessage.updateMany(
      {
        _id: { $in: ids },
        receiverId: me,
        deliveredAt: null,
      },
      { $set: { deliveredAt: new Date() } }
    );

    res.json({ success: true });
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

    // security check: lastSeenMessageId must belong to same conversation
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

    // notify only when something changed
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

      out.push({
        conversationId: c._id,
        peerUserId: peer,
        lastText: last?.text || "",
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