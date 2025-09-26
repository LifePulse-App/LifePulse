import moment from "moment-timezone";
import {
  Day,
  Months,
} from "../models/DateHelperService";

export class DateHelperService {
  public static months: Months[] = [
    { Id: 1, Name: "January", ShortName: "Jan" },
    { Id: 2, Name: "February", ShortName: "Feb" },
    { Id: 3, Name: "March", ShortName: "Mar" },
    { Id: 4, Name: "April", ShortName: "Apr" },
    { Id: 5, Name: "May", ShortName: "May" },
    { Id: 6, Name: "June", ShortName: "Jun" },
    { Id: 7, Name: "July", ShortName: "Jul" },
    { Id: 8, Name: "August", ShortName: "Aug" },
    { Id: 9, Name: "September", ShortName: "Sep" },
    { Id: 10, Name: "October", ShortName: "Oct" },
    { Id: 11, Name: "November", ShortName: "Nov" },
    { Id: 12, Name: "December", ShortName: "Dec" },
  ];

  // your raw data
  public static DAYS: Day[] = [
    { DayId: 1, DayName: "Monday" },
    { DayId: 2, DayName: "Tuesday" },
    { DayId: 3, DayName: "Wednesday" },
    { DayId: 4, DayName: "Thursday" },
    { DayId: 5, DayName: "Friday" },
    { DayId: 6, DayName: "Saturday" },
    { DayId: 7, DayName: "Sunday" },
  ];

  // your column‐definition for the grid
  public static DAYS_COLUMNS = [{ prop: "DayName", name: "Days" }];

  public static dateFormatConfig:
    | "year"
    | "years"
    | "y"
    | "month"
    | "months"
    | "M"
    | "week"
    | "weeks"
    | "w"
    | "day"
    | "days"
    | "d"
    | "hour"
    | "hours"
    | "h"
    | "minute"
    | "minutes"
    | "m"
    | "second"
    | "seconds"
    | "s"
    | "millisecond"
    | "milliseconds"
    | "ms" = "days";

  public static dp_MonthYear_Config: any = {
    parse: {
      dateInput: "MM/YYYY",
    },
    display: {
      dateInput: "MM/YYYY",
      monthYearLabel: "MMM YYYY",
      dateA11yLabel: "LL",
      monthYearA11yLabel: "MMMM YYYY",
    },
  };

  public static getServerDateFormat(
    date?: Date | string,
    format: string = MomentDateFormats.currentDateFormat
  ): Date | string {
    if (date) {
      let converted = moment(date).tz("Asia/Karachi").format(format);
      return converted;
    } else {
      let converted = moment(new Date()).tz("Asia/Karachi").format(format);
      return converted;
    }
  }

  public static getDatePickerFormat(date: Date | string): Date | string {
    return moment(date).tz("Asia/Karachi").toDate();
  }

  public static getDateFormat(
    date: Date | string,
    format?: string
  ): Date | string {
    return moment(new Date(date)).tz("Asia/Karachi").format(format);
  }

  public static isFromDateSameOrBeforeToDate(
    fromDate: Date | string,
    toDate: Date | string
  ): boolean {
    let date1 = moment(new Date(fromDate))
      .tz("Asia/Karachi")
      .format(MomentDateFormats.datePickerFormat);

    let date2 = moment(new Date(toDate))
      .tz("Asia/Karachi")
      .format(MomentDateFormats.datePickerFormat);

    let valid = moment(date1).isSameOrBefore(date2);
    return valid;
  }

  public static getDateDifference(
    fromDate: Date | string,
    toDate: Date | string,
    differIn = this.dateFormatConfig
  ): number {
    let date1 = moment(new Date(fromDate))
      .tz("Asia/Karachi")
      .format(MomentDateFormats.datePickerFormat);

    let date2 = moment(new Date(toDate))
      .tz("Asia/Karachi")
      .format(MomentDateFormats.datePickerFormat);

    let difference = 0;
    difference = moment(date2).diff(moment(date1), differIn) + 1;

    return difference;
  }

  public static getStartOfMonth(
    format: string = MomentDateFormats.currentDateFormatSlash
  ): string {
    const startOfMonth = moment().startOf("month").format(format);
    return startOfMonth;
  }

  public static getEndOfMonth(
    format: string = MomentDateFormats.currentDateFormatSlash
  ): string {
    const endOfMonth = moment().endOf("month").format(format);
    return endOfMonth;
  }

  public static getStartDateOfMonth(
    monthId: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear()
  ) {
    if (monthId < 1 || monthId > 12) {
      throw new Error("Invalid month ID. Month ID should be between 1 and 12.");
    }

    if (year < 1) {
      throw new Error("Invalid year. Year should be greater than 0.");
    }

    let date = moment()
      .year(year)
      .month(monthId - 1)
      .startOf("month");

    let startDateOfMonth = date.format(
      MomentDateFormats.currentDateFormatSlash
    );
    return startDateOfMonth;
  }

  public static getEndDateOfMonth(
    monthId: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear()
  ) {
    if (monthId < 1 || monthId > 12) {
      throw new Error("Invalid month ID. Month ID should be between 1 and 12.");
    }

    if (year < 1) {
      throw new Error("Invalid year. Year should be greater than 0.");
    }

    let date = moment()
      .year(year)
      .month(monthId - 1)
      .date(1)
      .endOf("month");

    let endDateOfMonth = date.format(MomentDateFormats.currentDateFormatSlash);
    return endDateOfMonth;
  }

  public static dayOfMonth(
    day: number,
    format: string = MomentDateFormats.currentDateFormatSlash
  ): string {
    let date = new Date(),
      y = date.getFullYear(),
      m = date.getMonth();
    let dayOfMonth = moment(new Date(y, m, day)).format(format);
    return dayOfMonth;
  }

  public static getTimeDifference(startDate: string, endDate: string) {
    const startDateMom = moment(new Date(startDate)); //todays date
    const endDateMom = moment(new Date(endDate)); // another date
    const duration = moment.duration(endDateMom.diff(startDateMom));
    const hours = duration.asHours();
    return hours;
  }

  

  public static getCurrentDate(): Date {
    return new Date();
  }

  public static getCurrentMonthYear(): Date | string {
    let currentDate = this.getCurrentDate();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  public static getNextMonthYear(): Date | string {
    let currentDate = this.getCurrentDate();
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  public static getCurrentMonthId(): number {
    return moment().month() + 1;
  }

  public static getPreviousDate(date: Date, durationInYears: number = 1) {
    return new Date(
      date.getFullYear() - durationInYears,
      date.getMonth(),
      date.getDate()
    );
  }

  public static parseTimeToDate(hhmm: string): Date {
    const today = new Date();
    const [hh, mm] = hhmm.split(":").map(Number);
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hh,
      mm,
      0,
      0
    );
  }

  public static fmtDate(value: string | null): string | null {
    if (!value) return null;

    // 1) Determine hours/minutes
    let hh: number, mm: number;
    const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      // "h:mm AM/PM"
      hh = parseInt(ampmMatch[1], 10);
      mm = parseInt(ampmMatch[2], 10);
      const isPM = ampmMatch[3].toUpperCase() === "PM";
      if (hh === 12) hh = isPM ? 12 : 0;
      else if (isPM) hh += 12;
    } else {
      // assume "HH:mm"
      const parts = value.split(":").map((v) => parseInt(v, 10));
      [hh, mm] = parts;
    }

    // 2) Build a Date for _today_ at that time (local)
    const now = new Date();
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hh,
      mm,
      0,
      0
    );

    // 3) Format manually as local ISO-like string (no Z!)
    const pad = (n: number) => n.toString().padStart(2, "0");
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const H = pad(d.getHours());
    const M = pad(d.getMinutes());

    return `${YYYY}-${MM}-${DD}T${H}:${M}:00`;
  }

  private static toMinutes(t: string): number {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    }
  public static diffMinutes(start: string, end: string): number {
      return this.toMinutes(end) - this.toMinutes(start);
  }

  public static getMonthName(
    monthId: number,
    isToGetFullName: boolean = true
  ): string {
    let foundMonth = this.months.find((x) => x.Id == monthId);
    if (foundMonth) {
      return isToGetFullName
        ? foundMonth.Name.toUpperCase()
        : foundMonth.ShortName.toUpperCase();
    }
    return "";
  }
}

export class MomentDateFormats {
  public static readonly currentDateFormat = "MM-DD-yyyy";
  public static readonly currentDateTimeFormat = "MM-DD-yyyy hh:mm A";
  public static readonly datePickerFormat = "MM-DD-yyyy";
  public static readonly currentDateFormatSlash = "MM/DD/yyyy";
  public static readonly listDataFormat = "MMM DD yyyy";
  public static readonly TimeFormat = "hh:mm A";
  public static readonly generalDisplayFormat = "ll";
  public static readonly dayNameFormat = "dddd";
  public static readonly batchFormat = "yyyyMMDD";
  public static readonly yearonlyFormat = "yyyy";
}

export class AngularDateFormats {
  public static readonly DayName = "EEEE";
  public static readonly GeneralFormat = "MMM d, y";
  public static readonly FullDate = "fullDate";
  public static readonly FullDateTime = "dd-MM-y h:mm:ss a";
  public static readonly TimeFormat = "h:mm:ss a";
}