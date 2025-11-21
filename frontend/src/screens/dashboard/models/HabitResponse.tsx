export type HabitStatus = "pending" | "verified" | "rejected";

export interface TodayHabit {
  id: string;
  habitName: string;
  icon: string;
  label: string;
  time: string;
  status: HabitStatus;
}

export interface GetTodayHabitsResponse {
  success: boolean;
  habits: TodayHabit[];
}