import User from '../models/UserSchema.js';

// Reward brackets: adjust as needed
const REWARD_TABLE = [
  { maxRank: 1,   reward: 500 },
  { maxRank: 10,  reward: 250  },
  { maxRank: 100, reward: 100  },
];

const rewardForRank = (rank) => {
  for (const row of REWARD_TABLE) {
    if (rank <= row.maxRank) return row.reward;
  }
  return 0;
};

// Helper: award rewards to a sorted array of users [{_id, monthlyXp, rewardBalance}, ...]
const awardSortedUsers = async (sortedUsers) => {
  for (let i = 0; i < sortedUsers.length; i++) {
    const rank = i + 1;
    const reward = rewardForRank(rank);
    if (reward > 0) {
      await User.updateOne(
        { _id: sortedUsers[i]._id },
        { $inc: { rewardBalance: reward } }
      );
    }
  }
};

export const runMonthlyReset = async () => {
  // 1) WORLD ranking
  const worldUsers = await User.find(
    { monthlyXp: { $gt: 0 } },
    '_id monthlyXp rewardBalance country city'
  )
    .sort({ monthlyXp: -1, _id: 1 })
    .lean();
  await awardSortedUsers(worldUsers);

  // 2) COUNTRY rankings (per country)
  const countryAgg = await User.aggregate([
    { $match: { monthlyXp: { $gt: 0 }, country: { $ne: '' } } },
    { $group: { _id: '$country', users: { $push: { _id: '$_id', monthlyXp: '$monthlyXp' } } } },
  ]);
  for (const c of countryAgg) {
    const sorted = c.users.sort((a, b) => (b.monthlyXp - a.monthlyXp) || (String(a._id).localeCompare(String(b._id))));
    await awardSortedUsers(sorted);
  }

  // 3) CITY rankings (per country+city)
  const cityAgg = await User.aggregate([
    { $match: { monthlyXp: { $gt: 0 }, country: { $ne: '' }, city: { $ne: '' } } },
    { $group: { _id: { country: '$country', city: '$city' }, users: { $push: { _id: '$_id', monthlyXp: '$monthlyXp' } } } },
  ]);
  for (const c of cityAgg) {
    const sorted = c.users.sort((a, b) => (b.monthlyXp - a.monthlyXp) || (String(a._id).localeCompare(String(b._id))));
    await awardSortedUsers(sorted);
  }

  // 4) Reset monthly XP for everyone
  await User.updateMany({}, { $set: { monthlyXp: 0 } });
};