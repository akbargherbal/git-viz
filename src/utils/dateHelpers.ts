// src/utils/dateHelpers.ts

import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  format,
} from "date-fns";
import { TimeBinType } from "@/types/domain";

/**
 * Date manipulation utilities for timeline binning
 */

export const getTimeBinStart = (date: Date, binType: TimeBinType): Date => {
  switch (binType) {
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfWeek(date, { weekStartsOn: 1 });
  }
};

export const getNextTimeBin = (date: Date, binType: TimeBinType): Date => {
  switch (binType) {
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
    case "quarter":
      return addQuarters(date, 1);
    case "year":
      return addYears(date, 1);
    default:
      return addWeeks(date, 1);
  }
};

export const formatTimeBin = (date: Date, binType: TimeBinType): string => {
  switch (binType) {
    case "week":
      return format(date, "'W'I, yyyy");
    case "month":
      return format(date, "MMM yyyy");
    case "quarter":
      return format(date, "'Q'Q yyyy");
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "'W'I, yyyy");
  }
};
