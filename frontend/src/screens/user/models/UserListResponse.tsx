export type UserListResponse = User[]

export interface User {
  Id: string
  FirstName: string
  LastName: string
  UserName: string
  Email: string
  PhoneNumber: string
  BranchName: string
  BranchId: number
  InstituteId: number
  Since: string
  RoleName: string
  RoleDescription: string
  IsDeleted: boolean
  LockoutEnabled: boolean
  ImagePath: string
  InstituteRoleId: number
  Success: boolean
  Message: any
}
