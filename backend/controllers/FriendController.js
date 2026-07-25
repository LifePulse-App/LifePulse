import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import Mood from "../models/MoodSchema.js";
import { sendToUser } from '../helpers/broadcastService.js';
import { TEMPLATES } from '../utils/notificationTemplates.js';
import { log } from "console";

/**
 * Helpers
 */
const isFriend = (user, otherId) => user.friends?.some(f => String(f.user) === String(otherId));
const hasOutgoingReq = (user, otherId) => user.friendRequests?.some(r => String(r.user) === String(otherId));
const hasIncomingReq = (user, otherId) => user.incomingFriendRequests?.some(r => String(r.user) === String(otherId));

/**
 * Send a friend request (current user -> target)
 */
export const sendFriendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params;
  
  if (currentUserId === targetUserId) {
    return res.status(400).json({ message: "Cannot friend yourself" });
  }

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);
  if (!them) return res.status(404).json({ message: "User not found" });

  // 1. Check if you are already friends
  if (isFriend(me, targetUserId)) {
    return res.json({ message: "Already friends", isFriend: true });
  }

  // 2. Check if THEY already sent ME a request (My Add acts as an Accept)
  const theySentMeReq = me.friendRequests?.some(r => String(r.user) === targetUserId);
  if (theySentMeReq) {
    me.friendRequests = me.friendRequests.filter(r => String(r.user) !== targetUserId);
    me.markModified('friendRequests'); // Force mongoose to save array change
    
    me.friends.push({ user: targetUserId });
    them.friends.push({ user: currentUserId });
    
    await me.save();
    await them.save();
    return res.json({ message: "Request accepted; you are now friends!", isFriend: true });
  }

  // 3. Check if I already sent THEM a request (Prevents duplicate click auto-adding)
  const iSentThemReq = them.friendRequests?.some(r => String(r.user) === currentUserId);
  if (iSentThemReq) {
    return res.json({ message: "Request already sent", requestSent: true });
  }

  // 4. Safely send the request
  them.friendRequests.push({ user: currentUserId, requestedAt: new Date() });
  await them.save();
  
  await sendToUser(targetUserId, {
    ...TEMPLATES.FRIEND_REQUEST_SENT(req.user.name),
    extra: {
      fromUserId: String(req.user._id),
      fromName: String(req.user.name),
    },
  });
  
  return res.json({ message: "Friend request sent", requestSent: true });
});

/**
 * Accept a friend request
 */
export const acceptFriendRequest = catchAsyncErrors(async (req, res) => {
const currentUserId = req.user.id;
  const { requesterId } = req.params;

  const me = await User.findById(currentUserId);
  const them = await User.findById(requesterId);
  if (!them) return res.status(404).json({ message: "User not found" });

  const hadRequest = hasOutgoingReq(me, requesterId);
  if (!hadRequest) return res.json({ message: "No request found" });

  // ⚡ FIX: Filter the array and explicitly mark it as modified
  me.friendRequests = me.friendRequests.filter(r => String(r.user) !== requesterId);
  me.markModified('friendRequests'); 
  
  if (!isFriend(me, requesterId)) me.friends.push({ user: requesterId });
  if (!isFriend(them, currentUserId)) them.friends.push({ user: currentUserId });

  await me.save();
  await them.save();
  await sendToUser(requesterId, {
    ...TEMPLATES.FRIEND_REQUEST_ACCEPTED(req.user.name),
    extra: {
      fromUserId: String(req.user._id),
      fromName: String(req.user.name),
    },
  });
  return res.json({ message: "Request accepted", isFriend: true });
});

/**
 * Remove/cancel a pending friend request
 */
export const removeFriendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { requesterId } = req.params; 

  const me = await User.findById(currentUserId);
  const them = await User.findById(requesterId);

  if (!me || !them) return res.status(404).json({ message: "User not found" });

  let modified = false;

  const initialMeCount = me.friendRequests.length;
  me.friendRequests = me.friendRequests.filter(r => String(r.user) !== requesterId);
  if (me.friendRequests.length < initialMeCount) {
    await me.save();
    modified = true;
  }

  const initialThemCount = them.friendRequests.length;
  them.friendRequests = them.friendRequests.filter(r => String(r.user) !== currentUserId);
  if (them.friendRequests.length < initialThemCount) {
    await them.save();
    modified = true;
  }

  if (modified) return res.json({ message: "Request removed successfully" });
  return res.json({ message: "No request found" });
});

/**
 * Unfriend
 */
export const unfriend = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;

  const me = await User.findById(currentUserId);
  const them = await User.findById(userId);
  if (!me || !them) return res.status(404).json({ message: "User not found" });

  const beforeMe = me.friends.length;
  const beforeThem = them.friends.length;

  me.friends = me.friends.filter(f => String(f.user) !== userId);
  them.friends = them.friends.filter(f => String(f.user) !== currentUserId);

  await me.save();
  await them.save();

  const changed = me.friends.length !== beforeMe || them.friends.length !== beforeThem;
  return res.json({ message: changed ? "Unfriended" : "Not friends", isFriend: false });
});

export const friendStatus = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params; 
  const currentUserId = req.user.id;
  const user = await User.findById(userId).select("friendRequests friends");
  if (!user) return res.status(404).json({ message: "User not found" });

  const isFriendFlag = isFriend(user, currentUserId);
  const hasRequestSent = user.friendRequests?.some(r => String(r.user) === currentUserId);
  const me = await User.findById(currentUserId).select("friendRequests");
  const hasIncoming = me?.friendRequests?.some(r => String(r.user) === userId);

  res.json({ isFriend: isFriendFlag, requestSent: hasRequestSent, requestIncoming: hasIncoming });
});

export const listFriends = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId)
    .populate("friends.user", "name username avatarUrl tick avatarVersion")
    .lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  const friends = (me.friends || [])
    .filter(f => f.user)
    .map(f => ({
      _id: f.user._id,
      name: f.user.name,
      username: f.user.username,
      avatar: f.user.avatarUrl,
      tick: f.user.tick,
      since: f.since,
    }));

  res.json({ friends });
});

export const pendingFriendRequests = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId)
    .populate("friendRequests.user", "name username avatarUrl tick")
    .lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  res.json({
    requests: (me.friendRequests || [])
      .filter(r => !me.friends.some(f => String(f.user) === String(r.user?._id)))
      .map(r => ({
        _id: r.user?._id,
        name: r.user?.name,
        username: r.user?.username,
        avatar: r.user?.avatarUrl,
        tick: r.user?.tick,
        requestedAt: r.requestedAt,
      })),
  });
});

export const searchUsers = catchAsyncErrors(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user?.id;
  if (!q) return res.status(200).json({ user: [], filteredUsersCount: 0 });

  const searchRegex = new RegExp(q, "i");
  let users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: searchRegex }, { name: searchRegex }],
  })
    .select("name username avatarUrl friendRequests friends tick")
    .lean();

  const me = await User.findById(currentUserId).select("friendRequests friends").lean();
  users = users.map(u => {
    const friend = isFriend(u, currentUserId);
    const requestSent = u.friendRequests?.some(r => String(r.user) === currentUserId);
    const incoming = me?.friendRequests?.some(r => String(r.user) === String(u._id));
    return {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatarUrl,
      tick: u.tick,
      isFriend: friend,
      requestSent,
      requestIncoming: incoming,
    };
  });

  res.status(200).json({ user: users, filteredUsersCount: users.length });
});

export const suggestedFriends = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;

  const me = await User.findById(currentUserId).select("friendRequests friends").lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  const excludeIds = [currentUserId, ...(me.friends || []).map(f => String(f.user))];

  let users = await User.find({ _id: { $nin: excludeIds } })
    .select("name username avatarUrl friendRequests friends tick")
    .limit(limit)
    .lean();

  users = users.map(u => {
    const friend = isFriend(u, currentUserId);
    const requestSent = u.friendRequests?.some(r => String(r.user) === currentUserId);
    const incoming = me?.friendRequests?.some(r => String(r.user) === String(u._id));
    return {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatarUrl,
      tick: u.tick,
      isFriend: friend,
      requestSent,
      requestIncoming: incoming,
    };
  });

  const shuffled = users.sort(() => 0.5 - Math.random());
  res.status(200).json({ suggestions: shuffled });
});


// ==========================================
// ⚡ RELATIONSHIP SYSTEM
// ==========================================

const checkAndCleanupGracePeriod = async (userDoc) => {
  const now = new Date();
  if (userDoc.partner && userDoc.partnerGracePeriodEnd && userDoc.partnerGracePeriodEnd < now) {
    const them = await User.findById(userDoc.partner);
    
    // Move to history for ME
    userDoc.relationshipHistory.push({
      partnerId: them ? them._id : userDoc.partner,
      partnerName: them ? them.name : "Unknown User",
      startedAt: userDoc.partnerSince,
      endedAt: userDoc.partnerGracePeriodEnd, 
    });
    userDoc.partner = null;
    userDoc.partnerSince = null;
    userDoc.partnerGracePeriodEnd = null;
    await userDoc.save();

    // Move to history for THEM
    if (them) {
      them.relationshipHistory.push({
        partnerId: userDoc._id,
        partnerName: userDoc.name,
        startedAt: them.partnerSince,
        endedAt: userDoc.partnerGracePeriodEnd,
      });
      them.partner = null;
      them.partnerSince = null;
      them.partnerGracePeriodEnd = null;
      await them.save();
    }
    return true; 
  }
  return false; 
};

export const previewProfile = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;

  let targetDoc = await User.findById(userId)
    .select("name username avatarUrl avatarVersion avatarThumbnailUrl level currentTitle country city isPublic tick partner partnerSince partnerGracePeriodEnd ")
    .lean(); // temporarily removed lean if we needed to save, but let's fetch properly

  if (!targetDoc) return res.status(404).json({ message: "User not found" });

  // Quick check and cleanup for target doc
  const targetUserObj = await User.findById(userId);
  const wasCleanedUp = await checkAndCleanupGracePeriod(targetUserObj);
  if (wasCleanedUp) {
    targetDoc = await User.findById(userId)
       .select("name username avatarUrl avatarVersion avatarThumbnailUrl level currentTitle country city isPublic tick partner partnerSince partnerGracePeriodEnd")
       .lean();
  }

  // Fetch ME to check arrays
  const me = await User.findById(currentUserId).select("friends friendRequests relationshipIncoming relationshipOutgoing partner").lean();
  
  const isFriendFlag = me ? isFriend(me, userId) : false;
  const requestSent = await User.exists({ _id: userId, "friendRequests.user": currentUserId });
  const requestIncoming = me?.friendRequests?.some((r) => String(r.user) === String(userId));
  const canSeeLocation = targetDoc.isPublic === true || isFriendFlag;

  const now = new Date();
  const moodDoc = await Mood.findOne({ user: userId, expiresAt: { $gt: now } })
    .sort({ createdAt: -1 }).select("mood createdAt expiresAt").lean();

  // ⚡ Check relationship array status
  const isPartner = targetDoc.partner && String(targetDoc.partner) === currentUserId;
  const relRequestSent = me?.relationshipOutgoing?.some(r => String(r.user) === userId);
  const relRequestIncoming = me?.relationshipIncoming?.some(r => String(r.user) === userId);

  // Change this block in previewProfile controller
let partnerData = null;
if (targetDoc.partner) { // Removed: && !targetDoc.partnerGracePeriodEnd
  const partnerUser = await User.findById(targetDoc.partner).select("name").lean();
  if (partnerUser) {
    const msInDay = 24 * 60 * 60 * 1000;
    const diff = now.getTime() - new Date(targetDoc.partnerSince).getTime();
    
    partnerData = {
      _id: partnerUser._id,
      name: partnerUser.name,
      days: Math.floor(diff / msInDay),
      // ⚡ Keep these even if suspended
      isSuspended: !!targetDoc.partnerGracePeriodEnd,
      gracePeriodEnd: targetDoc.partnerGracePeriodEnd || null
    };
  }
}

  const isSuspended = !!targetDoc.partnerGracePeriodEnd;

  res.json({
    user: {
      _id: targetDoc._id,
      name: targetDoc.name,
      username: targetDoc.username,
      avatarUrl: targetDoc.avatarUrl,
      avatarThumbnailUrl: targetDoc.avatarThumbnailUrl,
      level: targetDoc.level,
      title: targetDoc.currentTitle || "",
      country: canSeeLocation ? targetDoc.country || "" : "",
      city: canSeeLocation ? targetDoc.city || "" : "",
      mood: moodDoc?.mood || "",
      moodCreatedAt: moodDoc?.createdAt || null,
      moodExpiresAt: moodDoc?.expiresAt || null,
      tick: targetDoc?.tick,
      isPublic: !!targetDoc.isPublic,
      canSeeLocation,
      partner: partnerData, 
    },
    friendship: {
      isFriend: isFriendFlag,
      requestSent: !!requestSent,
      requestIncoming: !!requestIncoming,
    },
    // ⚡ Pass exact relationship status back to frontend
    relationship: {
      isPartner: !!isPartner,
      requestSent: !!relRequestSent,
      requestIncoming: !!relRequestIncoming,
      isSuspended: isSuspended,
      gracePeriodEnd: targetDoc.partnerGracePeriodEnd || null
    }
  });
});

/**
 * Send a relationship request
 */
export const sendRelationshipRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params;

  if (currentUserId === targetUserId) return res.status(400).json({ message: "Cannot date yourself" });

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);

  if (!them) return res.status(404).json({ message: "User not found" });

  await checkAndCleanupGracePeriod(me);
  await checkAndCleanupGracePeriod(them);

  // ⚡ Block if EITHER has a partner
  if (me.partner) return res.status(400).json({ message: "You are already in a relationship." });
  if (them.partner) return res.status(400).json({ message: "They are already in a relationship." });

  // ⚡ Prevent duplicate requests
  const alreadySent = me.relationshipOutgoing?.some(r => String(r.user) === targetUserId);
  if (alreadySent) return res.status(400).json({ message: "Request already sent." });

  const alreadyReceived = me.relationshipIncoming?.some(r => String(r.user) === targetUserId);
  if (alreadyReceived) return res.status(400).json({ message: "They already sent you a request. Please accept it." });

  // Initialize arrays if missing
  if (!me.relationshipOutgoing) me.relationshipOutgoing = [];
  if (!them.relationshipIncoming) them.relationshipIncoming = [];

  // Push to arrays (Unlimited allowed if single)
  me.relationshipOutgoing.push({ user: targetUserId });
  them.relationshipIncoming.push({ user: currentUserId });

  await me.save();
  await them.save();

  return res.json({ message: "Relationship request sent!", requestSent: true });
});

/**
 * Accept a relationship request
 */
export const acceptRelationshipRequest = catchAsyncErrors(async (req, res) => {
  console.log(req.params);
  
  const currentUserId = req.user.id;
  const { targetUserId } = req.params; // Requires the ID from the URL
  

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);

  if (!them) return res.status(404).json({ message: "User not found" });

  if (me.partner) return res.status(400).json({ message: "You already have a partner." });
  if (them.partner) return res.status(400).json({ message: "They already have a partner." });

  const hasIncoming = me.relationshipIncoming?.some(r => String(r.user) === targetUserId);
  if (!hasIncoming) return res.status(400).json({ message: "No incoming request from this user." });

  const now = new Date();

  // ⚡ Accept, then instantly wipe ALL other pending requests for both users
  me.relationshipIncoming = [];
  me.relationshipOutgoing = [];
  me.partner = them._id;
  me.partnerSince = now;
  me.partnerGracePeriodEnd = null;

  them.relationshipIncoming = [];
  them.relationshipOutgoing = [];
  them.partner = me._id;
  them.partnerSince = now;
  them.partnerGracePeriodEnd = null;

  await me.save();
  await them.save();

  return res.json({ message: "Relationship started!", success: true });
});

/**
 * Cancel or Decline a pending relationship request
 */
export const cancelRelationshipRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params; // Requires the ID from the URL

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);

  if (!them) return res.status(404).json({ message: "User not found" });

  let modified = false;

  // Check if I am cancelling an outgoing request
  const outIndex = me.relationshipOutgoing?.findIndex(r => String(r.user) === targetUserId);
  if (outIndex !== -1 && outIndex !== undefined) {
    me.relationshipOutgoing.splice(outIndex, 1);
    them.relationshipIncoming = them.relationshipIncoming.filter(r => String(r.user) !== currentUserId);
    modified = true;
  }

  // Check if I am declining an incoming request
  const inIndex = me.relationshipIncoming?.findIndex(r => String(r.user) === targetUserId);
  if (inIndex !== -1 && inIndex !== undefined) {
    me.relationshipIncoming.splice(inIndex, 1);
    them.relationshipOutgoing = them.relationshipOutgoing.filter(r => String(r.user) !== currentUserId);
    modified = true;
  }

  if (modified) {
    await me.save();
    await them.save();
    return res.json({ message: "Request cancelled.", success: true });
  }

  return res.status(400).json({ message: "No request found to cancel." });
});

/**
 * Suspend current partner (Starts 24-hour grace period)
 */
export const removeRelationship = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId);

  if (!me.partner) return res.status(400).json({ message: "You are not in a relationship." });

  const them = await User.findById(me.partner);
  
  const graceEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  me.partnerGracePeriodEnd = graceEnd;
  await me.save();

  if (them) {
    them.partnerGracePeriodEnd = graceEnd;
    await them.save();
  }

  return res.json({ 
    message: "Relationship suspended. You have 24 hours to restore it.", 
    success: true 
  });
});

/**
 * Restore relationship (Cancels the 24-hour grace period)
 */
export const restoreRelationship = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId);

  if (!me.partner) return res.status(400).json({ message: "No relationship to restore." });
  if (!me.partnerGracePeriodEnd) return res.status(400).json({ message: "Your relationship is already active." });

  const isExpired = await checkAndCleanupGracePeriod(me);
  if (isExpired) {
    return res.status(400).json({ message: "Grace period expired. Relationship lost permanently." });
  }

  const them = await User.findById(me.partner);

  me.partnerGracePeriodEnd = null;
  await me.save();

  if (them) {
    them.partnerGracePeriodEnd = null;
    await them.save();
  }

  return res.json({ message: "Relationship successfully restored!", success: true });
});