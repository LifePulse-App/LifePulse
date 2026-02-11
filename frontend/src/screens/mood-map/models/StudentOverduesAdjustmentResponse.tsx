export type StudentOverduesAdjustmentResponse = StudentOverduesAdjustment[]

export interface StudentOverduesAdjustment {
  OverduesAdjustmentId: number
  OverduesId: number
  AdjustmentAmount: number
  DiscountAmount: number
  LastBalance: number
  Comments: string
  ModifiedBy: string
  ModifiedDate: string
}
