// utils/notificationTemplates.js

export const TEMPLATES = {
  // ── Streaks ──
  STREAK_REMINDER: (name, streak) => ({
    title: `🔥 Don't break your streak, ${name}!`,
    body: `You're on a ${streak}-day streak. Open the app to keep it alive.`,
    type: 'streak_reminder',
  }),
  STREAK_ENDING: (name, streak) => ({
    title: `⚠️ ${name}, your streak ends in 1 hour!`,
    body: `${streak} days on the line. Don't let it slip away.`,
    type: 'streak_ending',
  }),
  STREAK_LOST: (name) => ({
    title: `💔 You lost your streak, ${name}`,
    body: `But hey — today is a fresh start. Come back and build it again.`,
    type: 'streak_lost',
  }),
  STREAK_MILESTONE: (name, streak) => ({
    title: `🎉 ${streak}-day streak, ${name}!`,
    body: `That's incredible. Keep the momentum going!`,
    type: 'streak_milestone',
  }),

  // ── Leaderboard ──
  LEADERBOARD_REFRESH: () => ({
    title: `🏆 Leaderboard just updated!`,
    body: `See where you stand. Rankings are live now.`,
    type: 'leaderboard_refresh',
  }),
  LEADERBOARD_RANK_UP: (name, oldRank, newRank) => ({
    title: `📈 You climbed the leaderboard, ${name}!`,
    body: `You moved from #${oldRank} to #${newRank}. Keep going!`,
    type: 'leaderboard_rank_up',
  }),
  LEADERBOARD_RANK_DOWN: (name, rank) => ({
    title: `📉 Someone overtook you, ${name}`,
    body: `You're now ranked #${rank}. Time to fight back!`,
    type: 'leaderboard_rank_down',
  }),

  // ── Friends ──
  FRIEND_REQUEST_SENT: (fromName) => ({
    title: `👋 Friend request from ${fromName}`,
    body: `${fromName} wants to connect with you. Accept or decline?`,
    type: 'friend_request',
  }),
  FRIEND_REQUEST_ACCEPTED: (fromName) => ({
    title: `🤝 ${fromName} accepted your request!`,
    body: `You and ${fromName} are now friends.`,
    type: 'friend_accepted',
  }),
  FRIEND_REQUEST_DECLINED: (fromName) => ({
    title: `Friend request declined`,
    body: `${fromName} declined your friend request.`,
    type: 'friend_declined',
  }),
  FRIEND_REMOVED: (name) => ({
    title: `Friend removed`,
    body: `${name} removed you from their friends list.`,
    type: 'friend_removed',
  }),

  // ── Mood Map ──
  MOOD_MAP_UPDATE: () => ({
    title: `🌍 The Mood Map just updated`,
    body: `See what vibes people are feeling around the world right now.`,
    type: 'mood_map',
  }),
  MOOD_MAP_TRENDING: (mood) => ({
    title: `✨ "${mood}" is trending worldwide`,
    body: `Thousands of people are feeling ${mood} right now. Check the map.`,
    type: 'mood_map_trending',
  }),

  // ── Challenges & Points ──
  DAILY_CHALLENGE: () => ({
    title: `⚡ Your daily challenge is waiting`,
    body: `New day, new challenge. Open the app and crush it.`,
    type: 'daily_challenge',
  }),
  CHALLENGE_COMPLETED: (name, points) => ({
    title: `✅ Challenge complete, ${name}!`,
    body: `You earned ${points} points. Check your rank!`,
    type: 'challenge_completed',
  }),
  POINTS_MILESTONE: (name, points) => ({
    title: `🎯 ${points.toLocaleString()} points, ${name}!`,
    body: `You've hit a new milestone. Keep pushing!`,
    type: 'points_milestone',
  }),

  // ── Weekly / Re-engagement ──
  WEEKLY_RECAP: (name, points) => ({
    title: `📊 Your weekly recap is ready, ${name}`,
    body: `You earned ${points} points this week. See the full breakdown.`,
    type: 'weekly_recap',
  }),
  WELCOME_BACK: (name) => ({
    title: `👋 Welcome back, ${name}!`,
    body: `You haven't been active in a while. Come see what's new.`,
    type: 'welcome_back',
  }),

  // ── Admin ──
  ADMIN_BROADCAST: (title, body) => ({ title, body, type: 'admin_broadcast' }),
  ADMIN_DIRECT: (title, body) => ({ title, body, type: 'admin_direct' }),
};