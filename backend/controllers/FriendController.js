import User from "../models/User.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";

const alreadyFriends = (u, otherId) =>
  u.friends?.some(f => String(f.user) === String(otherId));

const alreadyRequested = (u, otherId) =>
  u.friendRequests?.some(r => String(r.user) === String(otherId));

export const sendRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params;
  if (currentUserId === targetUserId)
    return res.status(400).json({ message: "Cannot friend yourself" });

  const me = await User.findById(currentUserId);
  const them = await User.findById(targetUserId);
  if (!them) return res.status(404).json({ message: "User not found" });

  if (alreadyFriends(me, targetUserId))
    return res.json({ message: "Already friends", isFriend: true });

  // If they already requested me, auto-accept both
  if (alreadyRequested(me, targetUserId)) {
    me.friendRequests = me.friendRequests.filter(r => String(r.user) !== targetUserId);
    me.friends.push({ user: targetUserId });
    them.friends.push({ user: currentUserId });
    await me.save();
    await them.save();
    return res.json({ message: "Request matched; now friends", isFriend: true });
  }

  // Otherwise, add request to them
  if (!alreadyRequested(them, currentUserId)) {
    them.friendRequests.push({ user: currentUserId });
    await them.save();
  }
  res.json({ message: "Friend request sent", requestSent: true });
});

export const acceptRequest = catchAsyncErrors(async (req, res) => {
  const currentUserId = req.user.id;
  const { requesterId } = req.params;

  const me = await User.findById(currentUserId);
  const them = await User.findById(requesterId);
  if (!them) return res.status(404).json({ message: "User not found" });

  const hadRequest = me.friendRequests?.some(r => String(r.user) === requesterId);
  if (!hadRequest) return res.json({ message: "No request found" });

  me.friendRequests = me.friendRequests.filter(r => String(r.user) !== requesterId);
  if (!alreadyFriends(me, requesterId)) me.friends.push({ user: requesterId });
  if (!alreadyFriends(them, currentUserId)) them.friends.push({ user: currentUserId });

  await me.save();
  await them.save();
  res.json({ message: "Request accepted", isFriend: true });
});

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

export const pendingRequests = catchAsyncErrors(async (req, res) => {
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