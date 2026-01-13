// src/utils/dateHelpers.ts

import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  format,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
} from "date-fns";
import { TimeBinType } from "@/types/domain";

/**
 * Date manipulation utilities for timeline binning
 */

export const getTimeBinStart = (date: Date, binType: TimeBinType): Date => {
  switch (binType) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfDay(date);
  }
};

export const formatTimeBin = (date: Date, binType: TimeBinType): string => {
  switch (binType) {
    case "day":
      return format(date, "MMM d, yyyy");
    case "week":
      return format(date, "'W'I, yyyy");
    case "month":
      return format(date, "MMM yyyy");
    case "quarter":
      return format(date, "'Q'Q yyyy");
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "MMM d, yyyy");
  }
};
