import User from '../models/UserSchema.js';
import { calculateXpProgress } from '../helpers/levels.js';

export const awardXp = async (userId, xpDelta) => {
  if (!xpDelta || xpDelta <= 0) return;

  const user = await User.findById(userId).select('totalXp monthlyXp level currentTitle');
  if (!user) return;

  user.totalXp   += xpDelta; // lifetime
  user.monthlyXp += xpDelta; // monthly (to be reset monthly)

  const { level, title } = calculateXpProgress(user.totalXp);
  user.level = level;
  user.currentTitle = title;

  await user.save();
  return { level, title, totalXp: user.totalXp, monthlyXp: user.monthlyXp };
};