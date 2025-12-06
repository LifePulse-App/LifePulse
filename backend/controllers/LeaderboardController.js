import User from '../models/UserSchema.js';
import ErrorHandler from '../utils/errorHandler.js';
import catchAsyncErrors from '../utils/catchAsyncErrors.js';

const buildScopeFilter = (scope, user, query) => {
  switch (scope) {
    case 'city':
      return { country: query.country || user.country, city: query.city || user.city };
    case 'country':
      return { country: query.country || user.country };
    case 'world':
    default:
      return {};
  }
};

// GET /api/leaderboard/monthly?scope=world|country|city&country=XX&city=YY
export const getMonthlyLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const scope = req.query.scope || 'world';
  const user = await User.findById(req.user._id).select(
    'monthlyXp totalXp level currentTitle country city username name avatarThumbnailUrl'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  const scopeFilter = buildScopeFilter(scope, user, req.query);

  const topPlayers = await User.find(
    { monthlyXp: { $gt: 0 }, ...scopeFilter },
    'username name monthlyXp level currentTitle country city avatarThumbnailUrl'
  )
    .sort({ monthlyXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    monthlyXp: { $gt: user.monthlyXp },
    ...scopeFilter,
  });
  const userRank = user.monthlyXp > 0 ? higherCount + 1 : null;

  res.status(200).json({
    success: true,
    scope,
    filter: scopeFilter,
    leaderboard: topPlayers.map((u, idx) => ({
      rank: idx + 1,
      userId: u._id,
      username: u.username,
      name: u.name,
      monthlyXp: u.monthlyXp,
      level: u.level,
      title: u.currentTitle,
      country: u.country,
      city: u.city,
      avatarThumbnailUrl: u.avatarThumbnailUrl,
    })),
    currentUser: {
      userId: user._id,
      username: user.username,
      name: user.name,
      monthlyXp: user.monthlyXp,
      rank: userRank,
      level: user.level,
      title: user.currentTitle,
      country: user.country,
      city: user.city,
      avatarThumbnailUrl: user.avatarThumbnailUrl,
    },
  });
});

// Optional permanent leaderboard (totalXp)
export const getPermanentLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const scope = req.query.scope || 'world';
  const user = await User.findById(req.user._id).select(
    'totalXp level currentTitle country city username name avatarThumbnailUrl'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  const scopeFilter = buildScopeFilter(scope, user, req.query);

  const topPlayers = await User.find(
    { totalXp: { $gt: 0 }, ...scopeFilter },
    'username name totalXp level currentTitle country city avatarThumbnailUrl'
  )
    .sort({ totalXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    totalXp: { $gt: user.totalXp },
    ...scopeFilter,
  });
  const userRank = user.totalXp > 0 ? higherCount + 1 : null;

  res.status(200).json({
    success: true,
    scope,
    filter: scopeFilter,
    leaderboard: topPlayers.map((u, idx) => ({
      rank: idx + 1,
      userId: u._id,
      username: u.username,
      name: u.name,
      xp: u.totalXp,
      level: u.level,
      title: u.currentTitle,
      country: u.country,
      city: u.city,
      avatarThumbnailUrl: u.avatarThumbnailUrl,
    })),
    currentUser: {
      userId: user._id,
      username: user.username,
      name: user.name,
      xp: user.totalXp,
      rank: userRank,
      level: user.level,
      title: user.currentTitle,
      country: user.country,
      city: user.city,
      avatarThumbnailUrl: user.avatarThumbnailUrl,
    },
  });
});