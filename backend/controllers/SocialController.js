import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";

// --- Follow a user ---
export const follow = catchAsyncErrors(async (req, res, next) => {
  const { userId, currentUserId } = req.params;
  const user = await User.findById(userId);
  const userr = await User.findById(currentUserId);
  if (!user) return res.status(404).send("User not found");

  if (userId === currentUserId) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  if (!user.isPublic) {
    const alreadyRequested = user.followRequests.some(req => req.user.toString() === currentUserId);
    const alreadyFollowing = user.followers.some(f => f.user.toString() === currentUserId);

    if (!alreadyRequested && !alreadyFollowing) {
      user.followRequests.push({ user: currentUserId, requestedAt: new Date() });
      await user.save();
    }
    return res.json({ message: "Follow request sent", requestSent: true });
  } else {
    const alreadyFollowing = user.followers.some(f => f.user.toString() === currentUserId);
    if (!alreadyFollowing) {
      user.followers.push({ user: currentUserId, followedAt: new Date() });
      userr.following.push({ user: userId, followedAt: new Date() });
      await user.save();
      await userr.save();
    }
    return res.json({ message: "Now following", isFollowing: true });
  }
});

// --- Check follow status (for frontend card logic) ---
export const followStatus = catchAsyncErrors(async (req, res, next) => {
  const { userId, currentUserId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  const isFollowing = user.followers.some(f => f.user.toString() === currentUserId);
  const isRequestSent = user.followRequests.some(req => req.user.toString() === currentUserId);

  res.status(200).json({ isFollowing, isRequestSent });
});

// --- Remove sent request ---
export const removeRequest = catchAsyncErrors(async (req, res, next) => {
  const { userId, requesterId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  const initialRequestsLength = user.followRequests.length;
  user.followRequests = user.followRequests.filter(req => req.user.toString() !== requesterId);

  if (user.followRequests.length < initialRequestsLength) {
    await user.save();
    return res.json({ message: "Request removed" });
  }
  res.json({ message: "No request found" });
});

// --- Accept incoming request ---
export const followAccept = catchAsyncErrors(async (req, res, next) => {
  const { userId, requesterId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  const requestIndex = user.followRequests.findIndex(req => req.user.toString() === requesterId);

  if (requestIndex !== -1) {
    user.followRequests.splice(requestIndex, 1);

    const alreadyFollowing = user.followers.some(f => f.user.toString() === requesterId);
    if (!alreadyFollowing) {
      user.followers.push({ user: requesterId, followedAt: new Date() });
    }

    await user.save();
    return res.json({ message: "Request accepted", isFollowing: true });
  }

  res.json({ message: "No request found" });
});

// --- Get all incoming requests for current user ---
export const getFollowRequests = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId)
    .populate("followRequests.user", "username avatar name")
    .lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({
    pendingRequests: user.followRequests.map(req => ({
      user: req.user,
      requestedAt: req.requestedAt
    }))
  });
});

// --- Unfollow ---
export const unfollow = catchAsyncErrors(async (req, res, next) => {
  const { userId, currentUserId } = req.params;
  const user = await User.findById(userId);
  const userr = await User.findById(currentUserId);

  if (!user || !userr) return res.status(404).send("User not found");

  const initialFollowersLength = user.followers.length;
  const initialFollowingLength = userr.following.length;

  user.followers = user.followers.filter(f => f.user.toString() !== currentUserId);
  user.followRequests = user.followRequests.filter(req => req.user.toString() !== currentUserId);
  userr.following = userr.following.filter(f => f.user.toString() !== userId);

  if (user.followers.length < initialFollowersLength || userr.following.length < initialFollowingLength) {
    await user.save();
    await userr.save();
    return res.json({ message: "Unfollowed", isFollowing: false });
  }
  res.json({ message: "You are not following this user" });
});

// --- Get a specific user's profile ---
export const specificuser = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("name username avatar bio followers followRequests");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- SEARCH WITH RELATIONSHIP FLAGS ---
export const search = catchAsyncErrors(async (req, res, next) => {
  const { q } = req.query;
  const currentUserId = req.user?.id;
  if (!q) {
    return res.status(200).json({ user: [], filteredUsersCount: 0 });
  }

  const searchRegex = new RegExp(q, 'i');
  let users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: searchRegex },
      { name: searchRegex }
    ],
  })
  .select("name username avatar bio followers followRequests")
  .lean();

  const currentUser = await User.findById(currentUserId)
    .select("followRequests")
    .lean();
  // Users who have sent me a request:
  const requestedMe = (currentUser?.followRequests ?? []).map(r => String(r.user));
  
  users = users.map(u => {
    const isFollowing = u.followers?.some(f => f.user.toString() === currentUserId);
    const isRequestSent = u.followRequests?.some(r => r.user.toString() === currentUserId);
    const hasRequestedMe = requestedMe.includes(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      isFollowing,
      isRequestSent,
      hasRequestedMe
    };
  });

  res.status(200).json({
    user: users,
    filteredUsersCount: users.length
  });
});


// --- SUGGESTION USERS WITH RELATIONSHIP FLAGS ---
export const suggestedUsers = catchAsyncErrors(async (req, res, next) => {
  const currentUserId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;

  const currentUser = await User.findById(currentUserId)
    .select("following followRequests")
    .lean();
  if (!currentUser) return res.status(404).json({ message: "User not found" });

  // Users who have sent me a request:
  const requestedMe = (currentUser?.followRequests ?? []).map(r => String(r.user));
  // Only exclude yourself:
  const excludedUserIds = [currentUserId];

  let users = await User.find({
    _id: { $nin: excludedUserIds }
  })
    .select("name username avatar bio followers followRequests")
    .limit(limit)
    .lean();

  users = users.map(u => {
    const isFollowing = u.followers?.some(f => f.user.toString() === currentUserId);
    const isRequestSent = u.followRequests?.some(r => r.user.toString() === currentUserId);
    const hasRequestedMe = requestedMe.includes(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      isFollowing,
      isRequestSent,
      hasRequestedMe
    };
  });

  const shuffled = users.sort(() => 0.5 - Math.random());
  res.status(200).json({ suggestions: shuffled });
});

// --- Followers list ---
export const followersList = catchAsyncErrors(async (req, res, next) => {
  const currentUserId = req.user.id;
  const user = await User.findById(req.params.userId)
    .populate("followers.user", "username avatar name followers followRequests")
    .lean();

  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const currentUser = await User.findById(currentUserId)
    .select("followRequests")
    .lean();
  const requestedMe = (currentUser?.followRequests ?? []).map(r => String(r.user));

  const followers = user.followers.map(f => {
    const u = f.user;
    const isFollowing = u.followers?.some(f2 => f2.user.toString() === currentUserId);
    const isRequestSent = u.followRequests?.some(r => r.user.toString() === currentUserId);
    const hasRequestedMe = requestedMe.includes(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      isFollowing,
      isRequestSent,
      hasRequestedMe,
      followedAt: f.followedAt
    }
  });

  res.status(200).json({ followers });
});

// --- Following list (not decorated) ---
export const followingList = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("following.user", "username avatar name")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const following = user.following.map(f => ({
      _id: f.user._id,
      name: f.user.name,
      username: f.user.username,
      avatar: f.user.avatar,
      followedAt: f.followedAt
    }));

    res.json(following);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});