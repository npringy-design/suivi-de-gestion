import { describe, expect, it } from 'vitest';

import { isDateInRange } from '@/features/dashboard/dashboardCalculations';

import { DEFAULT_SCHOOL_ZONE, SCHOOL_ZONES, getSchoolHolidayCalendar, resolveSchoolZone } from './schoolHolidays';

describe('schoolHolidays', () => {
  it('expose les 3 zones avec les mêmes 5 types de période par année scolaire', () => {
    SCHOOL_ZONES.forEach(zone => {
      const { periods } = getSchoolHolidayCalendar(zone);
      ['2024-2025', '2025-2026', '2026-2027'].forEach(schoolYear => {
        const names = periods.filter(p => p.schoolYear === schoolYear).map(p => p.name).sort();
        expect(names).toEqual(['Hiver', 'Noël', 'Printemps', 'Toussaint', 'Été'].sort());
      });
    });
  });

  it('retombe sur la zone B pour une zone absente ou inconnue', () => {
    expect(DEFAULT_SCHOOL_ZONE).toBe('B');
    expect(resolveSchoolZone(undefined)).toBe('B');
    expect(resolveSchoolZone('Z')).toBe('B');
    expect(getSchoolHolidayCalendar(undefined).zone).toBe('B');
  });

  it('a des périodes cohérentes (début <= fin) et des dates propres à la zone', () => {
    SCHOOL_ZONES.forEach(zone => {
      getSchoolHolidayCalendar(zone).periods.forEach(p => expect(p.start <= p.end).toBe(true));
    });
    const winter = (zone: string) => getSchoolHolidayCalendar(zone).periods.find(p => p.name === 'Hiver' && p.schoolYear === '2025-2026');
    expect(winter('A')?.start).toBe('2026-02-07');
    expect(winter('B')?.start).toBe('2026-02-14');
    expect(winter('C')?.start).toBe('2026-02-21');
  });

  it('couvre l\'année scolaire 2027-2028 (Toussaint et Noël) pour les 3 zones', () => {
    SCHOOL_ZONES.forEach(zone => {
      const periods = getSchoolHolidayCalendar(zone).periods.filter(p => p.schoolYear === '2027-2028');
      expect(periods.map(p => [p.name, p.start, p.end])).toEqual([
        ['Toussaint', '2027-10-23', '2027-11-07'],
        ['Noël', '2027-12-18', '2028-01-02'],
      ]);
    });
  });

  it('inclut le premier jour d\'une période même pour une date locale à minuit', () => {
    const zoneB = getSchoolHolidayCalendar('B').periods.find(p => p.name === 'Hiver' && p.schoolYear === '2025-2026');
    expect(zoneB).toBeDefined();
    expect(isDateInRange(new Date(2026, 1, 14), zoneB!.start, zoneB!.end)).toBe(true);
    expect(isDateInRange(new Date(2026, 2, 1), zoneB!.start, zoneB!.end)).toBe(true);
    expect(isDateInRange(new Date(2026, 1, 13), zoneB!.start, zoneB!.end)).toBe(false);
    expect(isDateInRange(new Date(2026, 2, 2), zoneB!.start, zoneB!.end)).toBe(false);
  });
});
