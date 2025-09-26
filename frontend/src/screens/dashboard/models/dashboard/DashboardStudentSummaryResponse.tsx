export interface DashboardStudentSummaryResponse {
    StudentSummary: StudentSummary
    DashboardBranchSummary: DashboardBranchSummary
    DashboardClassSummary: DashboardClassSummary
    DashboardFinanceSummary: DashboardFinanceSummary
    DailyAttendanceSummary: DailyAttendanceSummary
    MonthlyAttendanceSummary: MonthlyAttendanceSummary
  }
  
  export interface StudentSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalMale: number
    TotalFemale: number
    TotalPassedOut: number
  }
  
  export interface DashboardBranchSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalClasses: number
    TotalSections: number
  }
  
  export interface DashboardClassSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalClasses: number
    TotalSections: number
    TotalClassFee: number
    TotalStudentFee: number
    DiscountPercentage: number
    AverageFee: number
    FeeReceivedPercentage: number
  }
  
  export interface DashboardFinanceSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalBalance: number
    TotalFeeBalance: number
    TotalOverduesBalance: number
    TotalPaid: number
    TotalDiscount: number
    TotalFullyDiscounted: number
    TotalPendingMonths: number
    MonthlyTotalPaid: number
    MonthlyOverduesPaid: number
    MonthlyFeePaid: number
    MonthlyTotalDiscount: number
    MonthlyOverduesDiscount: number
    MonthlyFeeDiscount: number
    MonthlyOverduesFullyDiscounted: number
    MonthlyFeeFullyDiscounted: number
    TotalPaidToday: number
    TotalDiscountToday: number
    TotalPreviousOverduesPaid: number
    TotalCurrentOverduesPaid: number
    TotalFutureOverduesPaid: number
    TotalPreviousFeePaid: number
    TotalCurrentFeePaid: number
    TotalFutureFeePaid: number
    TodayTotalPaid: number
    TodayTotalDiscount: number
    MonthlyTotalFullyDiscounted: number
    TodayFeePaid: number
    TotalOverduesPaid: number
    TotalFeePaid: number
    TotalOverduesDiscount: number
    TotalFeeDiscounted: number
    TotalOverduesFullyDiscounted: number
    TotalFeeFullyDiscounted: number
    TodayOverduesPaid: number
    TodayFeeDiscount: number
    TodayOverduesDiscount: number
    TodayTotalFullyDiscounted: number
    TodayFeeFullyDiscounted: number
    TodayOveduesFullyDiscounted: number
  }
  
  export interface DailyAttendanceSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalPresents: number
    TotalAbsents: number
    TotalHalfLeave: number
    TotalLeave: number
  }
  
  export interface MonthlyAttendanceSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalPresents: number
    TotalAbsents: number
    TotalHalfLeave: number
    TotalLeave: number
    TotalDays: number
  }
  