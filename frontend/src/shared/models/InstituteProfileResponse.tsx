export interface InstituteProfileResponse {
    BranchId: number
    DefaultBranchId: number
    BranchName: string
    Address: string
    Country: string
    ImagePath: string
    IsApproved: boolean
    PackageName: string
    OrganizationId: number
    OrganizationReferenceId: string
    IsOrgOwner: boolean
    SessionsId: number
    InstituteId: number
    SessionName: string
    StartDate: string
    EndDate: string
    IsSessionActive: boolean
    InvoiceStatusId: number
    RemainingBalance: number
    TotalPendingMonths: number
    BankDetails: BankDetail[]
    SmsConfiguration: SmsConfiguration
    ReportConfiguration: ReportConfiguration
    Logos: Logos
    InstituteName: string
    OwnerName: string
    FoundedYear: string
    PrincipalName: string
    ContactNumber: string
    Email: string
    State: number
    StateFullName: string
    City: number
    CityFullName: string
    IsDefault: boolean
    IsActive: boolean
    IsToDeleteImage: boolean
    LastPaidDate: string
    CurrentMonthPaidStatus: string
  }
  
  export interface BankDetail {
    BranchId: number
    InstituteId: number
    BranchBanksId: number
    BankAccountNumber: string
    IBANNumber: string
    AccountTitle: string
    IsDefault: boolean
    BankClientId: string
    Category: string
    Factor: string
    SubFactor: string
    Type: string
    BankId: number
    BankName: string
    BankAddress: string
    BranchName: string
  }
  
  export interface SmsConfiguration {
    BranchId: number
    InstituteId: number
    SmsConfigurationId: number
    CommunicationType: string
    BranchName: string
  }
  
  export interface ReportConfiguration {
    DefaultReportConfigs: DefaultReportConfig[]
    BranchReportConfigs: BranchReportConfig[]
  }
  
  export interface DefaultReportConfig {
    ReportConfigurationId: number
    ReportName: string
    BackgroundImagePath: string
    ShowBranchNameImage: boolean
    ShowBranchNameText: boolean
  }
  
  export interface BranchReportConfig {
    BranchReportConfigurationId: number
    ReportConfigurationId: number
    InstituteId: number
    BranchId: number
    HasBranchNameImage: boolean
    UseDefaultConfig: boolean
    BackgroundImagePath: string
    ShowBranchNameImage: boolean
    ShowBranchNameText: boolean
  }
  
  export interface Logos {
    LogoId: number
    BranchId: number
    InstituteId: number
    BranchName: string
    EducationDepartmentLogo: string
    OrganizationLogo: string
    SinceLogo: string
    SchoolBuilding: string
    PrincipalStampLogo: string
    BoardAffiliationLogo: string
  }
  