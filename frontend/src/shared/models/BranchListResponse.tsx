export type BranchListResponse = Branch[]

export interface Branch {
  BranchId: number
  InstituteId: number
  BranchName: string
  BranchShortName: string
  PrincipalName: string
  ContactNumber: string
  Address: string
  Email: string
  Country: string
  State: number
  City: number
  IsDefault: boolean
  IsActive: boolean
  ImagePath: string
  StartingTime: string
  EndTime: string
  BranchWorkingDays: any
  WorkingDaysCount: number
  IsToUpdateWorkingDays: boolean
  RecordState: number
  IsToDeleteImage: boolean
}
