export type StudentListResponse = Student[]

export interface Student {
  StudentBasicId: number
  OldStudentBasicId: string
  FamilyInfoId: number
  OldFamilyInfoId: string
  StudentIdForSort: string
  FamilyIdForSort: string
  FirstName: string
  FatherName: string
  ClassSortOrder: number
  BranchClassId: number
  BranchClassName: string
  ClassSectionId: number
  ClassSectionName: string
  StudentImagePath: string
  DOB: string
  Gender: string
  GenderDescription: string
  StudentStatus: string
}
