export type DashboardResponse = DashboardSummary

export interface DashboardSummary // backend response shape:
{
  success: true,
  data: {
    greeting: string;
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
    };
    quickLogs: {
      mood: MoodDoc | null;
      habit: HabitDoc | null;
      proof: ProofDoc | null;
    };
    secondaryCards: {
      motivation: string;
      reflectionCount: number;
      habitCompletionRate: number;
    };
  };
}