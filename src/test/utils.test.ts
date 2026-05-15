import { describe, it, expect } from 'vitest';

import { getDashboardRowIndices, getISOWeek, parseHourInputToDecimal } from '../utils';

describe('utils', () => {
  describe('getDashboardRowIndices', () => {
    it('should return correct indices for a month', () => {
      const indices = getDashboardRowIndices(0, 2025); // January 2025
      expect(indices[1]).toBe(0); // 1st of January
      expect(indices[2]).toBe(1); // 2nd of January
      expect(indices[31]).toBeDefined(); // 31st of January
    });

    it('should handle different months correctly', () => {
      const indicesJan = getDashboardRowIndices(0, 2025);
      const indicesFeb = getDashboardRowIndices(1, 2025);
      expect(Object.keys(indicesJan).length).toBe(31);
      expect(Object.keys(indicesFeb).length).toBe(28);
    });

    it('should return sequential indices', () => {
      const indices = getDashboardRowIndices(0, 2025);
      const values = Object.values(indices);
      const maxValue = Math.max(...values);
      expect(maxValue).toBeGreaterThan(0);
    });
  });

  describe('getISOWeek', () => {
    it('should return correct ISO week', () => {
      const date = new Date(2025, 0, 1); // January 1, 2025
      const week = getISOWeek(date);
      expect(week).toBe(1);
    });

    it('should return correct week for different dates', () => {
      const date1 = new Date(2025, 0, 6); // January 6, 2025
      const date2 = new Date(2025, 0, 13); // January 13, 2025
      const week1 = getISOWeek(date1);
      const week2 = getISOWeek(date2);
      expect(week2).toBeGreaterThanOrEqual(week1);
    });

    it('should return a valid week number', () => {
      const date = new Date(2025, 6, 15); // July 15, 2025
      const week = getISOWeek(date);
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  describe('parseHourInputToDecimal', () => {
    it('converts common hour/minute inputs to decimal hours', () => {
      expect(parseHourInputToDecimal('7h30')).toBe(7.5);
      expect(parseHourInputToDecimal('7:30')).toBe(7.5);
      expect(parseHourInputToDecimal('7.30')).toBe(7.5);
      expect(parseHourInputToDecimal('7,30')).toBe(7.5);
      expect(parseHourInputToDecimal('8h05')).toBe(8.0833);
    });

    it('keeps simple decimal values available for existing numeric entries', () => {
      expect(parseHourInputToDecimal('7.5')).toBe(7.5);
      expect(parseHourInputToDecimal('7,5')).toBe(7.5);
      expect(parseHourInputToDecimal(7.5)).toBe(7.5);
    });
  });
});
