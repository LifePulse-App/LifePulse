export interface StudentRevokeOverduesResponse {
    StudentBasicId: number
    OverduesId: number
    AnnualItemInvoiceId: number
    TypeName: string
    OverduesStatusId: number
    StatusName: string
    RemainingAmount: number
    TotalAmount: number
    PaidAmount: number
    DiscountAmount: number
    Year: number
    FullName: string
    MonthYear: string
    MonthYearName: string
    OverduesTypeId: number
    Month: string
    SelectedMonthIds: string
    MonthId: number
    IsCurrentSession: boolean
    CreatedDate: string
    ModifiedDate: string
    Comments: string
    ClassFee: number
    MonthDetails: MonthDetail[]
  }
  
  export interface MonthDetail {
    MonthId: number
    Year: number
  }
  