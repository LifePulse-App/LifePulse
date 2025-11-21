export type DashboardResponse = DashboardSummary;

export interface DashboardSummary {
  success: true;
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

    // 🔥 NEW: today’s habits exactly for that FlatList
    todayHabits: Array<{
      id: string;
      habitName: string;
      icon: string;   // e.g. "book", "dumbbell"
      label: string;  // UI label
      time: string;   // "7:00 PM"
      status: "pending" | "verified" | "rejected";
    }>;
  };
}