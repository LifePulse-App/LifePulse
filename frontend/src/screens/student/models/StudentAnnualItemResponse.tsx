export class GenericBaseModel {
    public InstituteId: number = 0;
    public BranchId: number = 0;
  }

export class AnnualItemInvoiceRequest extends GenericBaseModel {
    OverduesId: number = 0;
    OverduesAdjustmentId: number = 0;
    EntryDate: string | Date = new Date();
    ModifiedDate: string | Date = new Date();
    Status: string = '';
    StudentBasicId: number = 0;
    ItemClassId: number = 0;
    ItemSectionId: number = 0;
    ItemClassName: string = "";
    ItemSectionName: string = "";
    TotalAmount: number = 0;
    PaidAmount: number = 0;
    RemainingAmount: number = 0;
    MonthId: number = 0;
    Year: number = 0;
    NetTotalAmount: number = 0;
    DiscountAmount: number = 0;
    MonthYear: Date | string = new Date();
    DayTimeBatchNumber: number = 0;
    AnnualItemInvoiceDetailRequest: AnnualItemInvoiceDetailRequest[] = [];
    AnnualItemAdjustments: AnnualItemInvoiceRequest[] = [];
    OverduesTypeId: number = 0;
    IsToRemoveItems: boolean = false;
    FamilyInfoId: number = 0;
    CommonCollectionId: number = 0;
  }
  export class AnnualItemInvoiceDetailRequest {
    AnnualItemInvoiceDetailId: number = 0;
    OverduesId: number = 0;
    ItemId: number = 0;
    ItemName: string = '';
    Quantity: number = 0;
    Price: number = 0;
    TotalAmount: number = 0;
    SortOrder: number = 0;
    ItemClassId: number = 0;
    ItemSectionId: number = 0;
  }