import AsyncStorage from '@react-native-async-storage/async-storage';

const DASHBOARD_CACHE_KEY = 'DASHBOARD_CACHE_V1';

export interface CachedDashboard {
  profile: {
    name: string;
    xpProgress: {
      level: number;
      title: string;
      currentXp: number;
      nextLevelXp: number | null;
      progressPercent: number;
    };
    streak: {
      count: number;
      lastUpdated: string;
    };
    streakTitle: string;
  } | null;
  secondaryCards: {
    motivation: string;
    reflectionCount: number;
    habitCompletionRate: number;
  } | null;
}

export const loadDashboardCache = async (): Promise<CachedDashboard | null> => {
  try {
    const json = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!json) return null;
    return JSON.parse(json) as CachedDashboard;
  } catch {
    return null;
  }
};

export const saveDashboardCache = async (data: CachedDashboard) => {
  try {
    await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore cache write errors
  }
};