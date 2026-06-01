import User from '../models/UserSchema.js';
import { calculateXpProgress } from '../helpers/levels.js';

export const awardXp = async (userId, xpDelta) => {
  if (!xpDelta || xpDelta <= 0) return;

  const user = await User.findById(userId).select('totalXp monthlyXp level currentTitle xp');
  if (!user) return;

  user.totalXp += xpDelta;
  user.monthlyXp += xpDelta;

  // keep legacy field consistent
  user.xp = user.totalXp;

  const { level, title } = calculateXpProgress(user.totalXp);
  user.level = level;
  user.currentTitle = title;

  await user.save();
  return { level, title, totalXp: user.totalXp, monthlyXp: user.monthlyXp };
};