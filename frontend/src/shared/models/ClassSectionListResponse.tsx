export type ClassSectionListResponse = ClassSection[]

export interface ClassSection {
  ClassSectionId: number
  SectionName: string
  BranchId: number
  BranchClassId: number
  BranchClassName: string
  BranchName: string
  IsDefault: boolean
  Fee: number
  TotalStudents: number
  TotalActiveStudents: number
  TotalInActiveStudents: number
  IsActive: boolean
}
