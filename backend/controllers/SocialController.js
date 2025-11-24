import User from "../models/UserSchema.js"
import catchAsyncErrors from "../utils/catchAsyncErrors.js"
import APIFilters from "../utils/apiFilters.js"
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
      return res.json({ message: "Now following", isFollowing: true , user, userr});
  }
});

export const followStatus = catchAsyncErrors(async (req, res, next) => { 
  const { userId, currentUserId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  const isFollowing = user.followers.some(f => f.user.toString() === currentUserId);
  const isRequestSent = user.followRequests.some(req => req.user.toString() === currentUserId);

  res.status(200).json({ isFollowing, isRequestSent });
});

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

export const getFollowRequests = async (req, res) => {
  try {
      const userId = req.user.id;
      const user = await User.findById(userId).populate("followRequests.user", "username avatar");

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ 
          pendingRequests: user.followRequests.map(req => ({
              user: req.user,
              requestedAt: req.requestedAt
          }))
      });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const unfollow = catchAsyncErrors(async (req, res, next) => {
  const { userId, currentUserId } = req.params;
  const user = await User.findById(userId);
  const userr = await User.findById(currentUserId);

  if (!user || !userr) return res.status(404).send("User not found");

  const initialFollowersLength = user.followers.length;
  const initialFollowingLength = userr.following.length;

  // Remove currentUserId from user's followers list
  user.followers = user.followers.filter(f => f.user.toString() !== currentUserId);
  
  // Remove follow request if it exists
  user.followRequests = user.followRequests.filter(req => req.user.toString() !== currentUserId);

  // Remove userId from currentUserId's following list
  userr.following = userr.following.filter(f => f.user.toString() !== userId);

  // Check if changes were made
  if (user.followers.length < initialFollowersLength || userr.following.length < initialFollowingLength) {
      await user.save();
      await userr.save();
      return res.json({ message: "Unfollowed", isFollowing: false });
  }

  res.json({ message: "You are not following this user" });
});



export const specificuser = catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
           user
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
})

export const search = catchAsyncErrors(async (req, res, next) => {
    const apiFilters = new APIFilters(User, req.query).search().filters();  

   apiFilters.query = apiFilters.query.find({ _id: { $ne: req.user.id } });

    let user = await apiFilters.query;
    let filteredUsersCount = user.length;
    user = await apiFilters.query.clone();

    res.status(200).json({
     user,
     filteredUsersCount
    });
});

export const followersList = async (req, res) => { 
    try {
      const user = await User.findById(req.params.userId)
        .populate("followers.user", "username avatar") // ✅ Populate `user` field inside followers
        .lean();
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      res.status(200).json({ 
        followers: user.followers
      });
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

export const followingList = catchAsyncErrors(async (req, res, next) => { 
  try {
    const user = await User.findById(req.params.userId).populate("following", "username avatar");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.following);
} catch (error) {
    res.status(500).json({ message: "Server error" });
}
})

// Suggest users for current user (excluding current user and users they already follow)
export const suggestedUsers = catchAsyncErrors(async (req, res, next) => {
  /**
   * Params: req.user.id      // current logged-in user ID
   * Optional Query: limit    // eg: /api/suggested-users?limit=5
   */
  try {
    const limit = parseInt(req.query.limit) || 20; // default 6 suggestions

    // Fetch current user and their following list
    const currentUser = await User.findById(req.user.id, "following");

    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // List of user IDs to exclude (current user + already following)
    const excludedUserIds = [req.user.id, ...currentUser.following.map(f => f.user.toString())];

    // Query for users not in excludedUserIds, and optionally public only, e.g. isPublic: true
    const users = await User.find({
      _id: { $nin: excludedUserIds }
    })
      .select("name username avatar bio") // select only necessary fields
      .limit(limit)
      .lean();

    // Optionally, shuffle results for random suggestions
    const shuffled = users.sort(() => 0.5 - Math.random());

    res.status(200).json({ suggestions: shuffled });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
