export type StudentFeeListResponse = StudentFeeList[];

export interface StudentFeeList {
  OverduesTypeId: number;
  Month: string;
  SelectedMonthIds: any;
  MonthId: number;
  IsCurrentSession: boolean;
  CreatedDate: string;
  ModifiedDate: any;
  Comments: any;
  ClassFee: number;
  MonthDetails: any;
  StudentBasicId: number;
  OverduesId: number;
  AnnualItemInvoiceId: number;
  TypeName: string;
  OverduesStatusId: number;
  StatusName: string;
  RemainingAmount: number;
  TotalAmount: number;
  PaidAmount: number;
  DiscountAmount: number;
  Year: number;
  FullName: any;
  MonthYear: string;
  MonthYearName: string;
}
