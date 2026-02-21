import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import Mood from "../models/MoodSchema.js";

/**
 * Helpers
 */
const isFriend = (user, otherId) => user.friends?.some(f => String(f.user) === String(otherId));
const hasOutgoingReq = (user, otherId) => user.friendRequests?.some(r => String(r.user) === String(otherId));
const hasIncomingReq = (user, otherId) => user.incomingFriendRequests?.some(r => String(r.user) === String(otherId));

/**
 * Send a friend request (current user -> target)
 * If target already sent me a request, auto-accept and create friendship.
 * Body/params: targetUserId (in params)
 */
export const sendFriendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params;
  if (currentUserId === targetUserId) return res.status(400).json({ message: "Cannot friend yourself" });

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);
  if (!them) return res.status(404).json({ message: "User not found" });

  if (isFriend(me, targetUserId)) return res.json({ message: "Already friends", isFriend: true });

  // If they already requested me, auto-accept
  if (hasOutgoingReq(me, targetUserId)) {
    return res.json({ message: "Request already sent", requestSent: true });
  }
  if (hasOutgoingReq(them, currentUserId)) {
    // they asked me; accept both sides
    them.friendRequests = them.friendRequests.filter(r => String(r.user) !== currentUserId);
    me.friends.push({ user: targetUserId });
    them.friends.push({ user: currentUserId });
    await me.save();
    await them.save();
    return res.json({ message: "Request matched; now friends", isFriend: true });
  }

  // otherwise create outgoing request to them
  them.friendRequests.push({ user: currentUserId, requestedAt: new Date() });
  await them.save();
  return res.json({ message: "Friend request sent", requestSent: true });
});

/**
 * Accept a friend request (current user accepts requesterId)
 */
export const acceptFriendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { requesterId } = req.params;

  const me = await User.findById(currentUserId);
  const them = await User.findById(requesterId);
  if (!them) return res.status(404).json({ message: "User not found" });

  const hadRequest = hasOutgoingReq(me, requesterId);
  if (!hadRequest) return res.json({ message: "No request found" });

  me.friendRequests = me.friendRequests.filter(r => String(r.user) !== requesterId);
  if (!isFriend(me, requesterId)) me.friends.push({ user: requesterId });
  if (!isFriend(them, currentUserId)) them.friends.push({ user: currentUserId });

  await me.save();
  await them.save();
  return res.json({ message: "Request accepted", isFriend: true });
});

/**
 * Remove/cancel a pending request (current user removes requesterId from their pending list)
 * This works for declining an incoming request (requesterId -> me)
 * or canceling my outgoing request (me -> targetId) by swapping ids on the route.
 */
export const removeFriendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { requesterId } = req.params; // requesterId could be the other party
  const me = await User.findById(currentUserId);
  if (!me) return res.status(404).json({ message: "User not found" });

  const initial = me.friendRequests.length;
  me.friendRequests = me.friendRequests.filter(r => String(r.user) !== requesterId);
  if (me.friendRequests.length < initial) {
    await me.save();
    return res.json({ message: "Request removed" });
  }
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

/**
 * Friend status flags
 */
export const friendStatus = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params; // target user
  const currentUserId = req.user.id;
  const user = await User.findById(userId).select("friendRequests friends");
  if (!user) return res.status(404).json({ message: "User not found" });

  const isFriendFlag = isFriend(user, currentUserId);
  const hasRequestSent = user.friendRequests?.some(r => String(r.user) === currentUserId);
  // incoming request = they sent to me (so I have it in my friendRequests)
  const me = await User.findById(currentUserId).select("friendRequests");
  const hasIncoming = me?.friendRequests?.some(r => String(r.user) === userId);

  res.json({ isFriend: isFriendFlag, requestSent: hasRequestSent, requestIncoming: hasIncoming });
});

/**
 * List my friends
 */
export const listFriends = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId)
    .populate("friends.user", "name username avatar")
    .lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  const friends = (me.friends || [])
    .filter(f => f.user)
    .map(f => ({
      _id: f.user._id,
      name: f.user.name,
      username: f.user.username,
      avatar: f.user.avatar,
      since: f.since,
    }));

  res.json({ friends });
});

/**
 * Incoming pending requests (to me)
 */
export const pendingFriendRequests = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const me = await User.findById(currentUserId)
    .populate("friendRequests.user", "name username avatar")
    .lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  res.json({
    requests: (me.friendRequests || []).map(r => ({
      _id: r.user?._id,
      name: r.user?.name,
      username: r.user?.username,
      avatar: r.user?.avatar,
      requestedAt: r.requestedAt,
    })),
  });
});

/**
 * Search users with friend flags
 */
export const searchUsers = catchAsyncErrors(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user?.id;
  if (!q) return res.status(200).json({ user: [], filteredUsersCount: 0 });

  const searchRegex = new RegExp(q, "i");
  let users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: searchRegex }, { name: searchRegex }],
  })
    .select("name username avatar friendRequests friends")
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
      avatar: u.avatar,
      isFriend: friend,
      requestSent,
      requestIncoming: incoming,
    };
  });

  res.status(200).json({ user: users, filteredUsersCount: users.length });
});

/**
 * Suggested users (not friends yet)
 */
export const suggestedFriends = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;

  const me = await User.findById(currentUserId).select("friendRequests friends").lean();
  if (!me) return res.status(404).json({ message: "User not found" });

  const excludeIds = [currentUserId, ...(me.friends || []).map(f => String(f.user))];

  let users = await User.find({ _id: { $nin: excludeIds } })
    .select("name username avatar friendRequests friends")
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
      avatar: u.avatar,
      isFriend: friend,
      requestSent,
      requestIncoming: incoming,
    };
  });

  const shuffled = users.sort(() => 0.5 - Math.random());
  res.status(200).json({ suggestions: shuffled });
});

export const previewProfile = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;

  const target = await User.findById(userId)
    .select("name username avatar avatarThumbnailUrl level currentTitle country city isPublic")
    .lean();

  if (!target) return res.status(404).json({ message: "User not found" });

  const me = await User.findById(currentUserId)
    .select("friends friendRequests")
    .lean();

  const isFriendFlag = me ? isFriend(me, userId) : false;

  // I sent request to them (they have my id in their friendRequests)
  const requestSent = await User.exists({
    _id: userId,
    "friendRequests.user": currentUserId,
  });

  // they sent request to me (I have their id in my friendRequests)
  const requestIncoming = me?.friendRequests?.some(
    (r) => String(r.user) === String(userId)
  );

  // Location visibility policy:
  // - public accounts share location to everyone
  // - friends share location to each other
  const canSeeLocation = target.isPublic === true || isFriendFlag;

  // Latest active (non-expired) mood
  const now = new Date();
  const moodDoc = await Mood.findOne({
    user: userId,
    expiresAt: { $gt: now },
  })
    .sort({ createdAt: -1 })
    .select("mood createdAt expiresAt")
    .lean();

  res.json({
    user: {
      _id: target._id,
      name: target.name,
      username: target.username,
      avatar: target.avatar,
      avatarThumbnailUrl: target.avatarThumbnailUrl,

      level: target.level,
      title: target.currentTitle || "",

      // only show if allowed
      country: canSeeLocation ? target.country || "" : "",
      city: canSeeLocation ? target.city || "" : "",

      // mood can be treated as public or follow same rule; you decide.
      // Here: mood is shown to everyone if it exists.
      mood: moodDoc?.mood || "",
      moodCreatedAt: moodDoc?.createdAt || null,
      moodExpiresAt: moodDoc?.expiresAt || null,

      // share setting
      isPublic: !!target.isPublic,
      canSeeLocation,
    },
    friendship: {
      isFriend: isFriendFlag,
      requestSent: !!requestSent,
      requestIncoming: !!requestIncoming,
    },
  });
});