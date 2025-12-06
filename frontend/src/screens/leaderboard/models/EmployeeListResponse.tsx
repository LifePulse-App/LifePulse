export type EmployeeListResponse = Employee[]

export interface Employee {
  DepartmentName: string
  BranchName: string
  EmployeeId: number
  FirstName: string
  LastName: string
  FatherName?: string
  HusbandName: string
  ContactNumber: string
  Gender: string
  CNIC: string
  IsActive: boolean
  ImagePath: string
  QRCodePath: string
  SectorsId: number
  DepartmentsId: number
  BranchId: number
  InstituteId: number
  JoiningDate: string
  SalaryAmount: number
  MonthlyOffHours: number
  OvertimeAllowed: boolean
  OvertimeHourlyWageAmount: number
  HourlyWageAmount: number
  DailyWagesAmount: number
  WorkingHours: number
  WorkingModel: string
  OvertimeThreshold: number
  RecordState: number
  EmployeeWorkingDays: any
  WorkingDaysCount: number
  DesignationId: number
  EmployeeStatus: boolean
  IsToDeleteImage: boolean
  PreviousOrganization: string
  OldEmployeeId: string
  MaritalStatus: string
  InTime: any
  OutTime: any
  UseProvidentFund: boolean
  ProvidentFundAmount: number
  ProvidentFundPercentage: number
  
}
