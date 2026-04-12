import ArPrivatePortal from "../models/ArPrivatePortal.js";
import ArPrivatePortalMessage from "../models/ArPrivatePortalMessage.js";
import { sendPrivatePortalJoinRequestNotification } from '../controllers/NotificationController.js';
import { sendJoinRequestReviewedNotification } from '../controllers/NotificationController.js';
import { nanoid } from "nanoid";

// Create portal with invite/request visibility
export const createPrivatePortal = async (req, res) => {
  try {
    const { name, geo, visibility = "invite" } = req.body;
    const creator = req.user._id;
    const inviteCode = nanoid(8);

    const portal = await ArPrivatePortal.create({
      name,
      creator,
      members: [creator],
      inviteCode,
      geo,
      visibility,
    });

    res.status(201).json({ success: true, portal });
  } catch (e) {
    console.error("[ar-private] createPrivatePortal", e);
    res.status(500).json({ message: "Failed to create portal" });
  }
};

// Join with inviteCode (INVITE-ONLY)
export const joinPrivatePortal = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;
    const portal = await ArPrivatePortal.findOne({ inviteCode, visibility: "invite" });
    if (!portal) return res.status(404).json({ message: "Portal not found or not invite-only" });
    if (portal.members.includes(userId))
      return res.status(400).json({ message: "Already a member" });

    portal.members.push(userId);
    await portal.save();

    res.json({ success: true, portal });
  } catch (e) {
    console.error("[ar-private] joinPrivatePortal", e);
    res.status(500).json({ message: "Failed to join portal" });
  }
};

// Request to join (REQUEST-ONLY portals)
export const requestToJoinPortal = async (req, res) => {
  try {
    const { portalId } = req.body;
    const userId = req.user._id;

    const portal = await ArPrivatePortal.findById(portalId);
    if (!portal || portal.visibility !== "request")
      return res.status(404).json({ message: "Portal not found or not request-based" });

    if (portal.members.includes(userId))
      return res.status(400).json({ message: "Already a member" });

    const alreadyRequested = portal.joinRequests
      .some(req => String(req.user) === String(userId) && req.status === "pending");
    if (alreadyRequested)
      return res.status(400).json({ message: "Already requested and pending approval" });

    portal.joinRequests.push({ user: userId });
    await portal.save();
    const creatorUser = await import('../models/User.js').then(x => x.default.findById(portal.creator).lean());
const applicantUser = await import('../models/User.js').then(x => x.default.findById(userId).lean());
await sendPrivatePortalJoinRequestNotification(
  portal.creator,
  portal.name,
  applicantUser?.name || applicantUser?.username || "Someone"
);
    res.json({ success: true, message: "Request submitted" });
  } catch (e) {
    console.error("[ar-private] requestToJoinPortal", e);
    res.status(500).json({ message: "Failed to request to join" });
  }
};

// See join requests (admin/creator only)
export const getPortalJoinRequests = async (req, res) => {
  try {
    const { portalId } = req.params;
    const userId = req.user._id;
    const portal = await ArPrivatePortal.findById(portalId).populate("joinRequests.user", "name username avatar");
    if (!portal) return res.status(404).json({ message: "Portal not found" });
    if (String(portal.creator) !== String(userId))
      return res.status(403).json({ message: "Only creator can see join requests" });

    res.json({ requests: portal.joinRequests });
  } catch (e) {
    console.error("[ar-private] getPortalJoinRequests", e);
    res.status(500).json({ message: "Failed to get join requests" });
  }
};

// Approve/Reject join request (admin/creator only)
export const reviewJoinRequest = async (req, res) => {
  try {
    const { portalId } = req.params;
    const { userId, action } = req.body; // action: "approve" or "reject"
    const me = req.user._id;

    const portal = await ArPrivatePortal.findById(portalId);
    if (!portal) return res.status(404).json({ message: "Portal not found" });
    if (String(portal.creator) !== String(me))
      return res.status(403).json({ message: "Only creator can approve/reject" });

    const reqIdx = portal.joinRequests.findIndex(r => String(r.user) === String(userId));
    if (reqIdx === -1) return res.status(404).json({ message: "Request not found" });

    portal.joinRequests[reqIdx].status = (action === "approve") ? "approved" : "rejected";
    if (action === "approve") {
      if (!portal.members.includes(userId)) portal.members.push(userId);
    }
    await portal.save();
    const userDoc = await import('../models/User.js').then(x => x.default.findById(userId).lean());
await sendJoinRequestReviewedNotification(
  userId,
  portal.name,
  action === "approve"
);
    res.json({ success: true, status: portal.joinRequests[reqIdx].status });
  } catch (e) {
    console.error("[ar-private] reviewJoinRequest", e);
    res.status(500).json({ message: "Failed to approve/reject" });
  }
};

// Get user's portals
export const getMyPortals = async (req, res) => {
  try {
    const userId = req.user._id;
    const portals = await ArPrivatePortal.find({ members: userId });
    res.json({ portals });
  } catch (e) {
    console.error("[ar-private] getMyPortals", e);
    res.status(500).json({ message: "Failed to get portals" });
  }
};

// Send message in private portal
export const postPrivateArMessage = async (req, res) => {
  try {
    const { portalId, text, media, messageType = "text", geo } = req.body;
    const senderId = req.user._id;

    const portal = await ArPrivatePortal.findById(portalId);
    if (!portal) return res.status(404).json({ message: "Portal not found" });
    if (!portal.members.map(id => String(id)).includes(String(senderId)))
      return res.status(403).json({ message: "Not a member" });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const msg = await ArPrivatePortalMessage.create({
      portalId,
      senderId,
      text,
      media,
      messageType,
      geo,
      expiresAt,
    });

    req.io?.to(`ar-private-portal:${portalId}`).emit("ar-private-message", msg);

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    console.error("[ar-private] postPrivateArMessage", e);
    res.status(500).json({ message: "Failed to post message" });
  }
};

// Get messages for a portal
export const getPrivateArMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { portalId } = req.params;

    const portal = await ArPrivatePortal.findById(portalId);
    if (!portal) return res.status(404).json({ message: "Portal not found" });
    if (!portal.members.map(id => String(id)).includes(String(userId)))
      return res.status(403).json({ message: "Not a member" });

    const messages = await ArPrivatePortalMessage.find({
      portalId,
      expiresAt: { $gte: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ messages });
  } catch (e) {
    console.error("[ar-private] getPrivateArMessages", e);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// React to a private portal message
export const reactToPrivateArMessage = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user._id;
    const msg = await ArPrivatePortalMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const portal = await ArPrivatePortal.findById(msg.portalId);
    if (!portal.members.map(id => String(id)).includes(String(userId)))
      return res.status(403).json({ message: "Not a member" });

    msg.reactions = msg.reactions.filter(r => String(r.userId) !== String(userId));
    msg.reactions.push({ userId, emoji, reactedAt: new Date() });

    await msg.save();
    req.io?.to(`ar-private-portal:${msg.portalId}`).emit("ar-private-message-reacted", {
      messageId,
      userId,
      emoji
    });

    res.json({ success: true, reactions: msg.reactions });
  } catch (e) {
    console.error("[ar-private] reactToPrivateArMessage", e);
    res.status(500).json({ message: "Failed to react" });
  }
};