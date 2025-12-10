import User from '../models/UserSchema.js';
import ErrorHandler from '../utils/errorHandler.js';
import catchAsyncErrors from '../utils/catchAsyncErrors.js';

const normalizeScope = (scope) =>
  (scope || 'world').toString().trim().toLowerCase();

const normalizeLocation = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const buildScopeFilter = (scope, user, query) => {
  const userCountry = normalizeLocation(user.country);
  const userCity = normalizeLocation(user.city);
  const queryCountry = normalizeLocation(query.country);
  const queryCity = normalizeLocation(query.city);

  switch (scope) {
    case 'city': {
      const city = queryCity || userCity;
      const country = queryCountry || userCountry;
      if (!city || !country) {
        throw new ErrorHandler('City scope requires country and city (profile or query)', 400);
      }
      return { country, city };
    }
    case 'country': {
      const country = queryCountry || userCountry;
      if (!country) {
        throw new ErrorHandler('Country scope requires country (profile or query)', 400);
      }
      return { country };
    }
    case 'world':
    default:
      return {};
  }
};

const getFriendIds = (userDoc) => {
  const ids = new Set();
  ids.add(String(userDoc._id));
  (userDoc.following || []).forEach((f) => {
    if (f?.user) ids.add(String(f.user));
  });
  return Array.from(ids);
};

// MONTHLY
export const getMonthlyLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const scope = normalizeScope(req.query.scope);
  const user = await User.findById(req.user._id).select(
    'monthlyXp totalXp level currentTitle country city username name avatarThumbnailUrl following'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  if (scope === 'friends') {
    const friendIds = getFriendIds(user);

    const topPlayers = await User.find(
      { _id: { $in: friendIds } },
      'username name monthlyXp level currentTitle country city avatarThumbnailUrl'
    )
      .sort({ monthlyXp: -1, _id: 1 })
      .limit(100)
      .lean();

    const higherCount = await User.countDocuments({
      _id: { $in: friendIds },
      monthlyXp: { $gt: user.monthlyXp },
    });
    const userRank = user.monthlyXp > 0 ? higherCount + 1 : null;

    return res.status(200).json({
      success: true,
      scope,
      filter: { friends: friendIds.length },
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
  }

  const scopeFilter = buildScopeFilter(scope, user, req.query);

  const topPlayers = await User.find(
    { monthlyXp: { $gt: 0 }, ...scopeFilter },
    'username name monthlyXp level currentTitle country city avatarThumbnailUrl'
  )
    .collation({ locale: 'en', strength: 2 }) // case-insensitive city/country
    .sort({ monthlyXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    monthlyXp: { $gt: user.monthlyXp },
    ...scopeFilter,
  }).collation({ locale: 'en', strength: 2 });

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

// PERMANENT
export const getPermanentLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const scope = normalizeScope(req.query.scope);
  const user = await User.findById(req.user._id).select(
    'totalXp level currentTitle country city username name avatarThumbnailUrl following'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  if (scope === 'friends') {
    const friendIds = getFriendIds(user);

    const topPlayers = await User.find(
      { _id: { $in: friendIds } },
      'username name totalXp level currentTitle country city avatarThumbnailUrl'
    )
      .sort({ totalXp: -1, _id: 1 })
      .limit(100)
      .lean();

    const higherCount = await User.countDocuments({
      _id: { $in: friendIds },
      totalXp: { $gt: user.totalXp },
    });
    const userRank = user.totalXp > 0 ? higherCount + 1 : null;

    return res.status(200).json({
      success: true,
      scope,
      filter: { friends: friendIds.length },
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
  }

  const scopeFilter = buildScopeFilter(scope, user, req.query);

  const topPlayers = await User.find(
    { totalXp: { $gt: 0 }, ...scopeFilter },
    'username name totalXp level currentTitle country city avatarThumbnailUrl'
  )
    .collation({ locale: 'en', strength: 2 })
    .sort({ totalXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    totalXp: { $gt: user.totalXp },
    ...scopeFilter,
  }).collation({ locale: 'en', strength: 2 });

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