export type DashboardResponse = DashboardSummary

export interface DashboardSummary {
    TotalInstitutes: number
    TotalActiveInstitutes: number
    TotalInactiveInstitutes: number
    TotalAmountCollection: number
    TotalRemainingAmount: number
    TotalPendingActivation: number
  }
  