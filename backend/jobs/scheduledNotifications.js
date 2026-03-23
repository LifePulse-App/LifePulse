// jobs/scheduledNotifications.js
import cron from 'node-cron';
import User from '../models/UserSchema.js';
import { sendToUser, broadcastToAll } from '../helpers/broadcastService.js';
import { TEMPLATES } from '../utils/notificationTemplates.js';

function isLastDayOfMonth() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // If tomorrow is the 1st, today is the last day
  return tomorrow.getDate() === 1;
}

export function startNotificationJobs() {

  // ── Daily challenge — 7 AM every day
  cron.schedule('0 7 * * *', async () => {
    console.log('[CRON] Daily challenge');
    await broadcastToAll(TEMPLATES.DAILY_CHALLENGE());
  });

  // ── Streak reminder — 8 PM every day
  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Streak reminder');
    try {
      const users = await User.find({
        streak: { $gt: 0 },
        'notifications.pauseStreak': { $ne: true },
      }).select('_id name streak').lean();
      for (const u of users) {
        await sendToUser(u._id, TEMPLATES.STREAK_REMINDER(u.name, u.streak));
      }
    } catch (e) { console.error('[CRON] Streak reminder error:', e.message); }
  });

  // ── Streak ending soon — 11 PM every day
  cron.schedule('0 23 * * *', async () => {
    console.log('[CRON] Streak ending soon');
    try {
      const users = await User.find({
        streak: { $gt: 0 },
        'notifications.pauseStreak': { $ne: true },
      }).select('_id name streak').lean();
      for (const u of users) {
        await sendToUser(u._id, TEMPLATES.STREAK_ENDING(u.name, u.streak));
      }
    } catch (e) { console.error('[CRON] Streak ending error:', e.message); }
  });

  // ── Leaderboard refresh — 11:59 PM on last day of every month
  cron.schedule('59 23 * * *', async () => {
    if (!isLastDayOfMonth()) return; // ← only runs on last day
    console.log('[CRON] Monthly leaderboard refresh');
    try {
      await broadcastToAll(TEMPLATES.LEADERBOARD_REFRESH());
    } catch (e) { console.error('[CRON] Leaderboard error:', e.message); }
  });

  // ── Mood map update — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Mood map update');
    try {
      await broadcastToAll(TEMPLATES.MOOD_MAP_UPDATE());
    } catch (e) { console.error('[CRON] Mood map error:', e.message); }
  });

  // ── Weekly recap — Sunday 9 AM
  cron.schedule('0 9 * * 0', async () => {
    console.log('[CRON] Weekly recap');
    try {
      const users = await User.find({}).select('_id name points').lean();
      for (const u of users) {
        await sendToUser(u._id, TEMPLATES.WEEKLY_RECAP(u.name, u.points || 0));
      }
    } catch (e) { console.error('[CRON] Weekly recap error:', e.message); }
  });

  // ── Welcome back inactive users — daily noon
  cron.schedule('0 12 * * *', async () => {
    console.log('[CRON] Welcome back');
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const users = await User.find({
        lastActiveAt: { $lt: threeDaysAgo },
      }).select('_id name').lean();
      for (const u of users) {
        await sendToUser(u._id, TEMPLATES.WELCOME_BACK(u.name));
      }
    } catch (e) { console.error('[CRON] Welcome back error:', e.message); }
  });

  console.log('[CRON] All jobs scheduled ✓');
}