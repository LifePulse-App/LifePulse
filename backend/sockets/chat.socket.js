import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

export default function registerChatSocket(io, socket) {
  // 1. Join Room
  socket.on("join-conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  // 2. Pure WS Read Receipts (Seen)
  socket.on("mark-seen", async ({ conversationId, peerUserId, lastSeenMessageId, myUserId }) => {
    try {
      const convoObj = toObjectId(conversationId);
      const peerObj = toObjectId(peerUserId);
      const meObj = toObjectId(myUserId);

      if (!convoObj || !peerObj || !meObj) return;

      const upd = await ChatMessage.updateMany(
        { conversationId: convoObj, senderId: peerObj, receiverId: meObj, seenAt: null },
        { $set: { seenAt: new Date() } }
      );

      if (upd.modifiedCount > 0 || upd.nModified > 0) {
        io.to(`conversation:${conversationId}`).emit("msg-seen", {
          msgId: lastSeenMessageId,
          userId: String(myUserId),
        });
      }
    } catch (err) {
      console.error("[WS] mark-seen error:", err);
    }
  });

  // 3. Pure WS Delivery Receipts
  socket.on("mark-delivered", async ({ messageIds, myUserId, conversationId }) => {
    try {
      if (!messageIds || !messageIds.length || !myUserId) return;
      const meObj = toObjectId(myUserId);
      const ids = messageIds.map(toObjectId).filter(Boolean);

      const upd = await ChatMessage.updateMany(
        { _id: { $in: ids }, receiverId: meObj, deliveredAt: null },
        { $set: { deliveredAt: new Date() } }
      );

      // If we know the conversation ID, broadcast it specifically
      if ((upd.modifiedCount > 0 || upd.nModified > 0) && conversationId) {
        // Loop and emit for each ID so the frontend catches it easily
        ids.forEach(id => {
          io.to(`conversation:${conversationId}`).emit("msg-delivered", {
            msgId: String(id),
            userId: String(myUserId)
          });
        });
      }
    } catch (err) {
      console.error("[WS] mark-delivered error:", err);
    }
  });

  // 4. Pure WS Emoji Reactions
  socket.on("react-message", async ({ messageId, emoji, myUserId, conversationId }) => {
    try {
      const msgObj = toObjectId(messageId);
      const meObj = toObjectId(myUserId);
      if (!msgObj || !meObj) return;

      const msg = await ChatMessage.findById(msgObj);
      if (!msg) return;

      // Filter out previous reactions from this user
      msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(myUserId));

      // If an emoji was passed, add it (if null/empty, it acts as a "remove reaction")
      if (emoji) {
        msg.reactions.push({ userId: meObj, emoji, reactedAt: new Date() });
      }

      await msg.save();

      io.to(`conversation:${conversationId}`).emit("msg-reacted", {
        msgId: messageId,
        userId: String(myUserId),
        emoji: emoji || null, // null tells the frontend to remove it
      });
    } catch (err) {
      console.error("[WS] react-message error:", err);
    }
  });
}