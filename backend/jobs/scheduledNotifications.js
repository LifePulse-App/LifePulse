import cron from 'node-cron';
import User from '../models/UserSchema.js';
import { sendToUser, broadcastToAll } from '../helpers/broadcastService.js';
import { TEMPLATES } from '../utils/notificationTemplates.js';

const BATCH_SIZE = 100;

// ─────────────────────────────────────────────
// Helper: Convert UTC → User Local Time
// ─────────────────────────────────────────────
function getUserLocalTime(timezone) {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: timezone || 'UTC',
    })
  );
}

// ─────────────────────────────────────────────
// Batch sender (scalable)
// ─────────────────────────────────────────────
async function sendInBatches(users, callback) {
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (user) => {
        try {
          await callback(user);
        } catch (err) {
          console.error(`[NOTIFICATION ERROR] ${user._id}:`, err.message);
        }
      })
    );
  }
}

// ─────────────────────────────────────────────
// Main Scheduler
// ─────────────────────────────────────────────
export function startNotificationJobs() {
  // =====================================================
  // 🔥 STREAK REMINDER (8 PM LOCAL USER TIME)
  // =====================================================
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Streak reminder check');

    try {
      const users = await User.find({
        'streak.count': { $gt: 0 },
        'notifications.pauseStreak': { $ne: true },
      })
        .select('_id name streak timezone lastStreakReminderAt')
        .lean();

      const targets = users.filter((u) => {
        const now = getUserLocalTime(u.timezone);

        const is8PM = now.getHours() === 20;
        const notSentToday =
          !u.lastStreakReminderAt ||
          new Date(u.lastStreakReminderAt).toDateString() !==
            new Date().toDateString();

        return is8PM && notSentToday;
      });

      await sendInBatches(targets, async (u) => {
        await sendToUser(
          u._id,
          TEMPLATES.STREAK_REMINDER(u.name, u.streak?.count ?? 0)
        );

        await User.updateOne(
          { _id: u._id },
          { $set: { lastStreakReminderAt: new Date() } }
        );
      });
    } catch (e) {
      console.error('[CRON] Streak reminder error:', e.message);
    }
  });

  // =====================================================
  // ⚠️ STREAK ENDING (11 PM LOCAL)
  // =====================================================
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Streak ending check');

    try {
      const users = await User.find({
        'streak.count': { $gt: 0 },
        'notifications.pauseStreak': { $ne: true },
      })
        .select('_id name streak timezone lastStreakEndingAt')
        .lean();

      const targets = users.filter((u) => {
        const now = getUserLocalTime(u.timezone);

        const is11PM = now.getHours() === 23;
        const notSentToday =
          !u.lastStreakEndingAt ||
          new Date(u.lastStreakEndingAt).toDateString() !==
            new Date().toDateString();

        return is11PM && notSentToday;
      });

      await sendInBatches(targets, async (u) => {
        await sendToUser(
          u._id,
          TEMPLATES.STREAK_ENDING(u.name, u.streak?.count ?? 0)
        );

        await User.updateOne(
          { _id: u._id },
          { $set: { lastStreakEndingAt: new Date() } }
        );
      });
    } catch (e) {
      console.error('[CRON] Streak ending error:', e.message);
    }
  });

  // =====================================================
  // 🏆 MONTHLY LEADERBOARD (UTC SAFE)
  // =====================================================
  cron.schedule('0 0 1 * *', async () => {
    console.log('[CRON] Monthly leaderboard refresh');

    try {
      await broadcastToAll(TEMPLATES.LEADERBOARD_REFRESH());
    } catch (e) {
      console.error('[CRON] Leaderboard error:', e.message);
    }
  });

  // =====================================================
  // 🌍 MOOD MAP (UTC SUNDAY)
  // =====================================================
  cron.schedule('0 0 * * 0', async () => {
    console.log('[CRON] Mood map update');

    try {
      await broadcastToAll(TEMPLATES.MOOD_MAP_UPDATE());
    } catch (e) {
      console.error('[CRON] Mood map error:', e.message);
    }
  });

  // =====================================================
  // 📊 WEEKLY RECAP (SUNDAY 9 AM LOCAL)
  // =====================================================
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Weekly recap check');

    try {
      const users = await User.find({})
        .select('_id name points timezone lastWeeklyRecapAt')
        .lean();

      const targets = users.filter((u) => {
        const now = getUserLocalTime(u.timezone);

        const isSunday = now.getDay() === 0;
        const is9AM = now.getHours() === 9;

        const notSentToday =
          !u.lastWeeklyRecapAt ||
          new Date(u.lastWeeklyRecapAt).toDateString() !==
            new Date().toDateString();

        return isSunday && is9AM && notSentToday;
      });

      await sendInBatches(targets, async (u) => {
        await sendToUser(
          u._id,
          TEMPLATES.WEEKLY_RECAP(u.name, u.points || 0)
        );

        await User.updateOne(
          { _id: u._id },
          { $set: { lastWeeklyRecapAt: new Date() } }
        );
      });
    } catch (e) {
      console.error('[CRON] Weekly recap error:', e.message);
    }
  });

  // =====================================================
  // 👋 WELCOME BACK (7 DAYS INACTIVE - UTC SAFE)
  // =====================================================
  cron.schedule('0 12 * * *', async () => {
    console.log('[CRON] Welcome back');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const users = await User.find({
        lastActiveAt: { $lt: sevenDaysAgo },
        $or: [
          { lastWelcomeNotificationAt: { $exists: false } },
          { lastWelcomeNotificationAt: { $lt: sevenDaysAgo } },
        ],
      })
        .select('_id name timezone lastWelcomeNotificationAt')
        .lean();

      await sendInBatches(users, async (u) => {
        await sendToUser(u._id, TEMPLATES.WELCOME_BACK(u.name));

        await User.updateOne(
          { _id: u._id },
          { $set: { lastWelcomeNotificationAt: new Date() } }
        );
      });
    } catch (e) {
      console.error('[CRON] Welcome back error:', e.message);
    }
  });

  console.log('[CRON] All jobs running (GLOBAL TIMEZONE SAFE) ✓');
}