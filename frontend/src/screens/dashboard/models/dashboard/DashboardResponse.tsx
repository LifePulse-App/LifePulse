export type DashboardResponse = DashboardSummary

export interface DashboardSummary {
    student: {
      student_info: {
        student_id: string;
        campus: string;
        name: string;
        status: string;
      };
      dashboard: {
        academic_standings: {
          cgpa: number;
          earned_credits: number;
          total_credits: number;
          inprogress_credits: number;
        };
        classes: any[]; // you can replace `any` with a proper class interface later
        news_announcements: {
          title: string;
          date: string;
          _id: string;
        }[];
        results: any[]; // placeholder for future
        today_classes: any[]; // placeholder for future
      };
      _id: string;
      __v: number;
    };
  }