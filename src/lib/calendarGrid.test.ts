import { describe, expect, it } from "vitest";
import { getDaysInMonth } from "date-fns";
import { buildMonthGrid } from "@/lib/calendarGrid";

const daysIn = (year: number, monthIndex: number) =>
  buildMonthGrid(new Date(year, monthIndex, 1)).daysInMonth;

describe("buildMonthGrid", () => {
  it("uses the real length of every month in a normal year", () => {
    const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    expected.forEach((days, monthIndex) => {
      expect(daysIn(2026, monthIndex)).toBe(days);
    });
  });

  it("uses 29 days for a leap-year February", () => {
    expect(daysIn(2024, 1)).toBe(29);
    expect(daysIn(2028, 1)).toBe(29);
  });

  it("handles the century leap-year rules", () => {
    expect(daysIn(2000, 1)).toBe(29);
    expect(daysIn(1900, 1)).toBe(28);
    expect(daysIn(2100, 1)).toBe(28);
  });

  it("matches date-fns for every month of several years", () => {
    for (let year = 2024; year <= 2028; year++) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        expect(daysIn(year, monthIndex)).toBe(getDaysInMonth(new Date(year, monthIndex, 1)));
      }
    }
  });

  it("lays the month out in complete Sunday-first weeks", () => {
    const grid = buildMonthGrid(new Date(2026, 10, 1)); // November 2026

    expect(grid.daysInMonth).toBe(30);
    expect(grid.days.length % 7).toBe(0);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
    expect(grid.days[0].getDay()).toBe(0); // Sunday
    expect(grid.days[grid.days.length - 1].getDay()).toBe(6); // Saturday
  });

  it("contains every day of the month exactly once", () => {
    const grid = buildMonthGrid(new Date(2026, 0, 1)); // January 2026

    const inMonth = grid.days
      .filter((day) => day.getMonth() === 0)
      .map((day) => day.getDate())
      .sort((a, b) => a - b);

    expect(inMonth).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
  });

  it("pads a month starting on Sunday without leading days from before it", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1)); // February 2026 starts on Sunday

    expect(grid.days[0].getDate()).toBe(1);
    expect(grid.days[0].getMonth()).toBe(1);
    expect(grid.days.length).toBe(28);
  });

  it("never renders fewer than four or more than six weeks", () => {
    for (let year = 2020; year <= 2030; year++) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const { weeks } = buildMonthGrid(new Date(year, monthIndex, 1));
        expect(weeks.length).toBeGreaterThanOrEqual(4);
        expect(weeks.length).toBeLessThanOrEqual(6);
      }
    }
  });
});
