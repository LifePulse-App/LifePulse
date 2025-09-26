export interface DashboardEmployeeSummaryResponse {
    EmployeeSummary: EmployeeSummary
    PayrollSummary: PayrollSummary
    DailyAttendanceSummary: DailyAttendanceSummary
    MonthlyAttendanceSummary: MonthlyAttendanceSummary
  }
  
  export interface EmployeeSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    TotalMale: number
    TotalFemale: number
    TotalMarried: number
  }
  
  export interface PayrollSummary {
    TotalBranches: number
    TotalPersons: number
    TotalActive: number
    TotalInActive: number
    MonthFullName: string
    MonthYearShortName: string
    MonthYearFullName: string
    Year: number
    TotalAllowances: number
    TotalIncentives: number
    TotalFundsDeducted: number
    TotalLoans: number
    TotalOneGoLoan: number
    TotalPartialLoan: number
    TotalOneGoFunded: number
    TotalPartialFunded: number
    TotalLoanFunded: number
    TotalProvidentFund: number
    TotalOvertimeAmount: number
    TotalGrossSalary: number
    TotalRoundedSalary: number 
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
  