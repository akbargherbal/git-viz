// src/utils/dateHelpers.ts

import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfQuarter, 
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears
} from 'date-fns';
import { TimeBinType } from '@/types/domain';

/**
 * Date manipulation utilities for timeline binning
 */

export const getTimeBinStart = (date: Date, binType: TimeBinType): Date => {
  switch (binType) {
    case 'day':
      return startOfDay(date);
    case 'week':
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday
    case 'month':
      return startOfMonth(date);
    case 'quarter':
      return startOfQuarter(date);
    case 'year':
      return startOfYear(date);
    default:
      return startOfDay(date);
  }
};

export const getTimeBinEnd = (date: Date, binType: TimeBinType): Date => {
  switch (binType) {
    case 'day':
      return endOfDay(date);
    case 'week':
      return endOfWeek(date, { weekStartsOn: 1 });
    case 'month':
      return endOfMonth(date);
    case 'quarter':
      return endOfQuarter(date);
    case 'year':
      return endOfYear(date);
    default:
      return endOfDay(date);
  }
};

export const advanceTimeBin = (date: Date, binType: TimeBinType, count: number = 1): Date => {
  switch (binType) {
    case 'day':
      return addDays(date, count);
    case 'week':
      return addWeeks(date, count);
    case 'month':
      return addMonths(date, count);
    case 'quarter':
      return addQuarters(date, count);
    case 'year':
      return addYears(date, count);
    default:
      return addDays(date, count);
  }
};

export const getTimeBinCount = (start: Date, end: Date, binType: TimeBinType): number => {
  switch (binType) {
    case 'day':
      return Math.ceil(differenceInDays(end, start)) + 1;
    case 'week':
      return Math.ceil(differenceInWeeks(end, start)) + 1;
    case 'month':
      return Math.ceil(differenceInMonths(end, start)) + 1;
    case 'quarter':
      return Math.ceil(differenceInQuarters(end, start)) + 1;
    case 'year':
      return Math.ceil(differenceInYears(end, start)) + 1;
    default:
      return Math.ceil(differenceInDays(end, start)) + 1;
  }
};

export const formatTimeBin = (date: Date, binType: TimeBinType): string => {
  switch (binType) {
    case 'day':
      return format(date, 'MMM d, yyyy');
    case 'week':
      return format(date, "'W'I, yyyy");
    case 'month':
      return format(date, 'MMM yyyy');
    case 'quarter':
      return format(date, "'Q'Q yyyy");
    case 'year':
      return format(date, 'yyyy');
    default:
      return format(date, 'MMM d, yyyy');
  }
};

export const formatDateTime = (date: Date): string => {
  return format(date, 'PPpp');
};

export const formatDate = (date: Date): string => {
  return format(date, 'PP');
};
