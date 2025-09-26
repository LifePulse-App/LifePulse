export type BranchClassListResponse = BranchClass[]

export interface BranchClass {
  BranchClassId: number
  ShortName: string
  BranchClassName: string
  InstituteId: number
  BranchId: number
  BranchName: string
  Fee: number
  TotalStudents: number
  TotalActiveStudents: number
  TotalInActiveStudents: number
  TotalSections: number
  SortOrder: number
  IsActive: boolean
}
