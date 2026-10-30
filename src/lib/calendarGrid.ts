import {
  addDays,
  endOfMonth,
  endOfWeek,
  getDaysInMonth,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export interface MonthGrid {
  /** First day of the requested month. */
  monthStart: Date;
  /** The month laid out as whole weeks (Sunday first), including padding days. */
  weeks: Date[][];
  /** Every cell of the grid in reading order. */
  days: Date[];
  /** Number of days in the requested month: 28, 29, 30 or 31. */
  daysInMonth: number;
}

/**
 * Builds the day grid for a month. The real length of the month comes from the
 * calendar (date-fns getDaysInMonth), so 31-day months, 30-day months and
 * leap-year Februaries are all handled instead of assuming a fixed length.
 */
export const buildMonthGrid = (month: Date): MonthGrid => {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });

  const days: Date[] = [];
  let pointer = gridStart;
  while (pointer <= gridEnd) {
    days.push(pointer);
    pointer = addDays(pointer, 1);
  }

  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return {
    monthStart,
    weeks,
    days,
    daysInMonth: getDaysInMonth(monthStart),
  };
};

/** True when the date belongs to the month being displayed. */
export const isDayInMonth = (date: Date, monthStart: Date): boolean =>
  isSameMonth(date, monthStart);
