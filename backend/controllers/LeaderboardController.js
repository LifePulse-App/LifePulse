import mongoose from "mongoose";
import User from '../models/UserSchema.js';
import ErrorHandler from '../utils/errorHandler.js';
import catchAsyncErrors from '../utils/catchAsyncErrors.js';

const normalizeScope = (scope) => (scope || 'world').toString().trim().toLowerCase();
const normalizeLocation = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

const getQueryVal = (q, key) =>
  q?.[key] ??
  q?.params?.[key] ??
  q?.[`params[${key}]`];

const buildScopeFilter = (scope, user, query) => {
  const userCountry = normalizeLocation(user.country);
  const userCity = normalizeLocation(user.city);
  const qCountry = normalizeLocation(query.country);
  const qCity = normalizeLocation(query.city);

  switch (scope) {
    case 'city': {
      const country = qCountry || userCountry;
      const city = qCity || userCity;
      if (!country || !city) {
        throw new ErrorHandler('City scope requires country and city (profile or query)', 400);
      }
      return { country, city };
    }
    case 'country': {
      const country = qCountry || userCountry;
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

  (userDoc.friends || []).forEach((f) => {
    if (f?.user) ids.add(String(f.user));
    else if (f?._id) ids.add(String(f._id));
    else if (typeof f === 'string' || typeof f === 'object') ids.add(String(f));
  });

  (userDoc.following || []).forEach((f) => {
    if (f?.user) ids.add(String(f.user));
    else if (f?._id) ids.add(String(f._id));
    else if (typeof f === 'string' || typeof f === 'object') ids.add(String(f));
  });

  return Array.from(ids);
};

// MONTHLY
export const getMonthlyLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const rawScope = getQueryVal(req.query, 'scope');
  const rawCountry = getQueryVal(req.query, 'country');
  const rawCity = getQueryVal(req.query, 'city');

  const scope = normalizeScope(rawScope);
  
  const user = await User.findById(req.user._id).select(
    'monthlyXp totalXp level currentTitle country city username name avatarUrl following friends tick isPremium premiumPreferences blockedUsers blockedBy'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  const blockedIds = [...(user.blockedUsers || []), ...(user.blockedBy || [])].map(String);
  const userMonthlyXp = user.monthlyXp || 0;

  if (scope === 'friends') {
    const friendIds = getFriendIds(user).filter(id => !blockedIds.includes(String(id)));

    const topPlayers = await User.find(
      { accountStatus: 'active', _id: { $in: friendIds } },
      'username name monthlyXp level currentTitle country city avatarUrl tick isPremium premiumPreferences'
    )
      .sort({ monthlyXp: -1, _id: 1 })
      .limit(100)
      .lean();

    const higherCount = await User.countDocuments({
      _id: { $in: friendIds },
      monthlyXp: { $gt: userMonthlyXp },
    });

    const userRank = userMonthlyXp > 0 ? higherCount + 1 : null;
    const currentUserBadge = user.isPremium && user.premiumPreferences?.premiumBadge !== false;

    return res.status(200).json({
      success: true,
      scope,
      filter: { friends: friendIds.length },
      leaderboard: topPlayers.map((u, idx) => {
        const showBadge = u.isPremium && u.premiumPreferences?.premiumBadge !== false;
        return {
          rank: idx + 1,
          userId: u._id,
          username: u.username,
          name: u.name,
          monthlyXp: u.monthlyXp,
          level: u.level,
          title: u.currentTitle,
          country: u.country,
          city: u.city,
          avatarUrl: u.avatarUrl,
          tick: u.tick,
          isPremium: showBadge,
          showPremiumBadge: showBadge
        };
      }),
      currentUser: {
        userId: user._id,
        username: user.username,
        name: user.name,
        monthlyXp: userMonthlyXp,
        rank: userRank,
        level: user.level,
        title: user.currentTitle,
        country: user.country,
        city: user.city,
        avatarUrl: user.avatarUrl,
        tick: user.tick,
        isPremium: currentUserBadge,
        showPremiumBadge: currentUserBadge
      },
    });
  }

  const scopeFilter = buildScopeFilter(scope, user, { country: rawCountry, city: rawCity });

  const topPlayers = await User.find(
    { accountStatus: 'active',
      _id: { $nin: blockedIds },
      monthlyXp: { $gt: 0 }, 
      ...scopeFilter 
    },
    'username name monthlyXp level currentTitle country city avatarUrl tick isPremium premiumPreferences'
  )
    .collation({ locale: 'en', strength: 2 })
    .sort({ monthlyXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    _id: { $nin: blockedIds },
    monthlyXp: { $gt: userMonthlyXp },
    ...scopeFilter,
  }).collation({ locale: 'en', strength: 2 });

  const userRank = userMonthlyXp > 0 ? higherCount + 1 : null;
  const currentUserBadge = user.isPremium && user.premiumPreferences?.premiumBadge !== false;

  res.status(200).json({
    success: true,
    scope,
    filter: scopeFilter,
    leaderboard: topPlayers.map((u, idx) => {
      const showBadge = u.isPremium && u.premiumPreferences?.premiumBadge !== false;
      return {
        rank: idx + 1,
        userId: u._id,
        username: u.username,
        name: u.name,
        monthlyXp: u.monthlyXp,
        level: u.level,
        title: u.currentTitle,
        country: u.country,
        city: u.city,
        avatarUrl: u.avatarUrl,
        tick: u.tick,
        isPremium: showBadge,
        showPremiumBadge: showBadge
      };
    }),
    currentUser: {
      userId: user._id,
      username: user.username,
      name: user.name,
      monthlyXp: userMonthlyXp,
      rank: userRank,
      level: user.level,
      title: user.currentTitle,
      country: user.country,
      city: user.city,
      avatarUrl: user.avatarUrl,
      tick: user.tick,
      isPremium: currentUserBadge,
      showPremiumBadge: currentUserBadge
    },
  });
});

// PERMANENT
export const getPermanentLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const rawScope = getQueryVal(req.query, 'scope');
  const rawCountry = getQueryVal(req.query, 'country');
  const rawCity = getQueryVal(req.query, 'city');

  const scope = normalizeScope(rawScope);
  
  const user = await User.findById(req.user._id).select(
    'totalXp level currentTitle country city username name avatarUrl following friends tick isPremium premiumPreferences blockedUsers blockedBy'
  );
  if (!user) return next(new ErrorHandler('User not found', 404));

  const blockedIds = [...(user.blockedUsers || []), ...(user.blockedBy || [])].map(String);
  const userTotalXp = user.totalXp || 0;

  if (scope === 'friends') {
    const friendIds = getFriendIds(user).filter(id => !blockedIds.includes(String(id)));

    const topPlayers = await User.find(
      { accountStatus: 'active', _id: { $in: friendIds } },
      'username name totalXp level currentTitle country city avatarUrl tick isPremium premiumPreferences'
    )
      .sort({ totalXp: -1, _id: 1 })
      .limit(100)
      .lean();

    const higherCount = await User.countDocuments({
      _id: { $in: friendIds },
      totalXp: { $gt: userTotalXp },
    });

    const userRank = userTotalXp > 0 ? higherCount + 1 : null;
    const currentUserBadge = user.isPremium && user.premiumPreferences?.premiumBadge !== false;

    return res.status(200).json({
      success: true,
      scope,
      filter: { friends: friendIds.length },
      leaderboard: topPlayers.map((u, idx) => {
        const showBadge = u.isPremium && u.premiumPreferences?.premiumBadge !== false;
        return {
          rank: idx + 1,
          userId: u._id,
          username: u.username,
          name: u.name,
          xp: u.totalXp,
          level: u.level,
          title: u.currentTitle,
          country: u.country,
          city: u.city,
          avatarUrl: u.avatarUrl,
          tick: u.tick,
          isPremium: showBadge,
          showPremiumBadge: showBadge,
        };
      }),
      currentUser: {
        userId: user._id,
        username: user.username,
        name: user.name,
        xp: userTotalXp,
        rank: userRank,
        level: user.level,
        title: user.currentTitle,
        country: user.country,
        city: user.city,
        avatarUrl: user.avatarUrl,
        tick: user.tick,
        isPremium: currentUserBadge,
        showPremiumBadge: currentUserBadge,
      },
    });
  }

  const scopeFilter = buildScopeFilter(scope, user, { country: rawCountry, city: rawCity });

  const topPlayers = await User.find(
    { accountStatus: 'active',
      _id: { $nin: blockedIds },
      totalXp: { $gt: 0 }, 
      ...scopeFilter 
    },
    'username name totalXp level currentTitle country city avatarUrl tick isPremium premiumPreferences'
  )
    .collation({ locale: 'en', strength: 2 })
    .sort({ totalXp: -1, _id: 1 })
    .limit(100)
    .lean();

  const higherCount = await User.countDocuments({
    _id: { $nin: blockedIds },
    totalXp: { $gt: userTotalXp },
    ...scopeFilter,
  }).collation({ locale: 'en', strength: 2 });

  const userRank = userTotalXp > 0 ? higherCount + 1 : null;
  const currentUserBadge = user.isPremium && user.premiumPreferences?.premiumBadge !== false;

  res.status(200).json({
    success: true,
    scope,
    filter: scopeFilter,
    leaderboard: topPlayers.map((u, idx) => {
      const showBadge = u.isPremium && u.premiumPreferences?.premiumBadge !== false;
      return {
        rank: idx + 1,
        userId: u._id,
        username: u.username,
        name: u.name,
        xp: u.totalXp,
        level: u.level,
        title: u.currentTitle,
        country: u.country,
        city: u.city,
        avatarUrl: u.avatarUrl,
        tick: u.tick,
        isPremium: showBadge,
        showPremiumBadge: showBadge,
      };
    }),
    currentUser: {
      userId: user._id,
      username: user.username,
      name: user.name,
      xp: userTotalXp,
      rank: userRank,
      level: user.level,
      title: user.currentTitle,
      country: user.country,
      city: user.city,
      avatarUrl: user.avatarUrl,
      tick: user.tick,
      isPremium: currentUserBadge,
      showPremiumBadge: currentUserBadge,
    },
  });
});