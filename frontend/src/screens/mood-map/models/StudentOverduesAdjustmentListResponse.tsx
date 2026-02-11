export type StudentOverduesAdjustmentListResponse = StudentOverduesAdjustmentList[]

export interface StudentOverduesAdjustmentList {
  OverduesAdjustmentId: number
  OverduesId: number
  AdjustmentAmount: number
  DiscountAmount: number
  LastBalance: number
  Comments: string
  ModifiedBy: string
  ModifiedDate: string
}
