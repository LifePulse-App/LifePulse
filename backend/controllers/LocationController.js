import Location from "../models/LocationSchema.js";
import User from "../models/UserSchema.js";
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import Mood from "../models/MoodSchema.js";

// POST /api/location/update
export const updateMyLocation = catchAsyncErrors(async (req, res, next) => {
  const { lng, lat } = req.body;
  if (lng === undefined || lat === undefined) {
    return next(new ErrorHandler("lng/lat required", 400));
  }

  const updated = await Location.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      coords: { lng, lat },
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Socket emit to friends who are allowed to see
  req.io?.to(`user:${req.user._id.toString()}`).emit("location:self", updated);

  res.status(200).json({ success: true, location: updated });
});

// POST /api/location/share
export const setShareMode = catchAsyncErrors(async (req, res, next) => {
  const { shareMode, sharedWith } = req.body;

  if (!["all", "none", "custom"].includes(shareMode)) {
    return next(new ErrorHandler("Invalid shareMode", 400));
  }

  const update = {
    shareMode,
    sharedWith: shareMode === "custom" ? (sharedWith || []) : [],
  };

  const updated = await Location.findOneAndUpdate(
    { user: req.user._id },
    update,
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, location: updated });
});

// GET /api/location/friends
export const getFriendsLocations = catchAsyncErrors(async (req, res, next) => {
  const me = await User.findById(req.user._id).select("friends");
  if (!me) return next(new ErrorHandler("User not found", 404));

  const friendIds = me.friends.map((f) => f.user);

  const friendsLocations = await Location.find({
    user: { $in: friendIds },
    $or: [
      { shareMode: "all" },
      { shareMode: "custom", sharedWith: req.user._id },
    ],
  }).populate("user", "name username avatarUrl");

  const moods = await Mood.find({ user: { $in: friendIds } })
    .sort({ createdAt: -1 })
    .lean();

  const moodMap = new Map();
  for (const m of moods) {
    const id = String(m.user);
    if (!moodMap.has(id)) moodMap.set(id, m.mood);
  }

  const withMood = friendsLocations.map((loc) => {
    const id = String(loc.user?._id || loc.user);
    return {
      ...loc.toObject(),
      mood: moodMap.get(id) || null,
    };
  });

  res.status(200).json({ success: true, locations: withMood });
});