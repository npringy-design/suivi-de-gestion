import { describe, expect, it } from 'vitest';

import { getPublicHolidays, isPublicHoliday } from './publicHolidays';

describe('getPublicHolidays', () => {
  it('renvoie les 11 fériés triés, dates mobiles comprises (Pâques 2027 = 28 mars)', () => {
    const holidays = getPublicHolidays(2027);
    expect(holidays).toHaveLength(11);
    expect(holidays.map(h => h.date)).toEqual([...holidays.map(h => h.date)].sort());
    const byName = Object.fromEntries(holidays.map(h => [h.name, h.date]));
    expect(byName['Lundi de Pâques']).toBe('2027-03-29');
    expect(byName.Ascension).toBe('2027-05-06');
    expect(byName['Lundi de Pentecôte']).toBe('2027-05-17');
  });

  it('calcule Pâques 2025 (20 avril) et 2026 (5 avril)', () => {
    expect(isPublicHoliday('2025-04-21', 2025)).toBe('Lundi de Pâques');
    expect(isPublicHoliday('2025-05-29', 2025)).toBe('Ascension');
    expect(isPublicHoliday('2026-04-06', 2026)).toBe('Lundi de Pâques');
    expect(isPublicHoliday('2026-05-25', 2026)).toBe('Lundi de Pentecôte');
  });
});

describe('isPublicHoliday', () => {
  it('reconnaît les fériés fixes et renvoie null sinon', () => {
    expect(isPublicHoliday('2027-07-14', 2027)).toBe('Fête nationale');
    expect(isPublicHoliday('2027-12-25', 2027)).toBe('Noël');
    expect(isPublicHoliday('2027-07-15', 2027)).toBeNull();
    expect(isPublicHoliday('2026-07-14', 2027)).toBeNull();
  });
});
