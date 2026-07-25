import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
import OnlineManager from "../managers/OnlineManager.js"; 

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

export default function registerChatSocket(io, socket) {
  socket.on("join-conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  // 1. Pure WS Delivery Receipts
  socket.on("mark-delivered", async ({ messageIds, myUserId, conversationId }) => {
    try {
      if (!messageIds || !messageIds.length || !myUserId) return;
      const meObj = toObjectId(myUserId);
      const ids = messageIds.map(toObjectId).filter(Boolean);

      // Fetch messages FIRST to know who the sender is
      const pendingMsgs = await ChatMessage.find({ _id: { $in: ids }, receiverId: meObj, deliveredAt: null }).lean();
      if (!pendingMsgs.length) return;

      await ChatMessage.updateMany(
        { _id: { $in: ids }, receiverId: meObj, deliveredAt: null },
        { $set: { deliveredAt: new Date() } }
      );

      // Group by sender and notify them DIRECTLY via OnlineManager
      const bySender = new Set(pendingMsgs.map(m => String(m.senderId)));
      bySender.forEach(senderId => {
        // ⚡ FIX: Use OnlineManager's built-in emitToUser
        OnlineManager.emitToUser(io, senderId, "msg-delivered", {
          messageIds: pendingMsgs.map(m => String(m._id)), // Send array of IDs
          userId: String(myUserId),
          conversationId
        });
      });
    } catch (err) {
      console.error("[WS] mark-delivered error:", err);
    }
  });

  // 2. Pure WS Read Receipts (Seen)
  socket.on("mark-seen", async ({ conversationId, peerUserId, lastSeenMessageId, myUserId }) => {
    try {
      const convoObj = toObjectId(conversationId);
      const peerObj = toObjectId(peerUserId);
      const meObj = toObjectId(myUserId);

      if (!convoObj || !peerObj || !meObj) return;

      const lastMsg = await ChatMessage.findById(toObjectId(lastSeenMessageId));
      if (!lastMsg) return;

      const upd = await ChatMessage.updateMany(
        { conversationId: convoObj, senderId: peerObj, receiverId: meObj, seenAt: null, createdAt: { $lte: lastMsg.createdAt } },
        { $set: { seenAt: new Date() } }
      );

      if (upd.modifiedCount > 0 || upd.nModified > 0) {
        // ⚡ FIX: Use OnlineManager's built-in emitToUser
        OnlineManager.emitToUser(io, String(peerObj), "msg-seen", {
          msgId: lastSeenMessageId,
          userId: String(myUserId),
          conversationId: String(conversationId)
        });
      }
    } catch (err) {
      console.error("[WS] mark-seen error:", err);
    }
  });

  // 3. Pure WS Emoji Reactions
  socket.on("react-message", async ({ messageId, emoji, myUserId, conversationId }) => {
    try {
      const msgObj = toObjectId(messageId);
      const meObj = toObjectId(myUserId);
      if (!msgObj || !meObj) return;

      const msg = await ChatMessage.findById(msgObj);
      if (!msg) return;

      msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(myUserId));

      if (emoji) {
        msg.reactions.push({ userId: meObj, emoji, reactedAt: new Date() });
      }

      await msg.save();

      // Reactions can still use room emission because both users need to see it update live
      io.to(`conversation:${conversationId}`).emit("msg-reacted", {
        msgId: messageId,
        userId: String(myUserId),
        emoji: emoji || null,
      });
    } catch (err) {
      console.error("[WS] react-message error:", err);
    }
  });
}