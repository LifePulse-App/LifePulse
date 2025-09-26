export type EmployeeLoanResponse = EmployeeLoan[]

export interface EmployeeLoan {
  EmployeeLoanId: number
  TotalAmount: number
  RemainingAmount: number
  PaidAmount: number
  DeductionAmount: number
  DeductionDate: string
  LastDeductedDate: string
  LoanStatus: string
  MonthId: number
  FullName: any
  Month: any
  Year: number
  LoanType: string
  Description: string
  TypeName: any
  EmployeeId: number
  BranchId: number
  InstituteId: number
  SalaryInProcess: boolean
  IsToRevoke: boolean
}
