import { describe, expect, it } from 'vitest';

import type { SchoolHolidayCalendar, Shift, ShiftStaffMember } from '@/types/dataTypes';
import {
  computeDayNeeds,
  computeDayShortages,
  computeLegalAlerts,
  payrollPct,
  productivity,
  requiredStaff,
  shiftCost,
  shiftDurationHours,
} from './shiftCalculations';
import { isoWeekNumber, mondayOfIso } from './shiftDates';
import { buildStaffMembers, buildWeekDayContext } from './shiftSources';

const member = (overrides: Partial<ShiftStaffMember> = {}): ShiftStaffMember => ({
  key: 'A', nom: 'Alice', roles: ['salle'], contractHours: 35, forfaitJour: false, preferredRestDays: [], ...overrides,
});

const shift = (id: string, date: string, start: string, end: string): Shift => ({
  id, staffKey: 'A', date, start, end, roleId: 'salle', service: 'soir', status: 'validated',
});

describe('durée et coût', () => {
  it('gère le passage de minuit', () => {
    expect(shiftDurationHours('18h30', '00h00')).toBe(5.5);
    expect(shiftDurationHours('11h30', '15h00')).toBe(3.5);
  });
  it('coût = durée × taux', () => {
    expect(shiftCost({ start: '18h00', end: '22h00' }, 20)).toBe(80);
  });
});

describe('indicateurs', () => {
  it('productivité et masse salariale', () => {
    expect(productivity(1000, 20)).toBe(50);
    expect(productivity(1000, 0)).toBeNull();
    expect(payrollPct(240, 1000)).toBe(24);
    expect(payrollPct(240, 0)).toBeNull();
  });
});

describe('besoins par rôle', () => {
  const rule = { roleId: 'salle', service: 'both' as const, coversPerPerson: 25, min: 2, max: 4 };
  it('arrondi supérieur, plancher min, plafond max', () => {
    expect(requiredStaff(rule, 51)).toBe(3);
    expect(requiredStaff(rule, 10)).toBe(2);
    expect(requiredStaff(rule, 500)).toBe(4);
  });
  it('coversPerPerson null → min', () => {
    expect(requiredStaff({ ...rule, coversPerPerson: null }, 500)).toBe(2);
  });
  it('manquants calculés par service', () => {
    const needs = computeDayNeeds([rule], { cvMidi: 51, cvSoir: 10, caMidi: 0, caSoir: 0 });
    const shortages = computeDayShortages(needs, [shift('1', '2026-11-09', '11h30', '15h00')].map(s => ({ ...s, service: 'midi' as const })));
    expect(shortages).toEqual([{ roleId: 'salle', missing: 4 }]);
  });
});

describe('alertes légales', () => {
  const monday = '2026-11-09';
  const rules = ['rest11h', 'max10hDay', 'max48hWeek', 'restDays2', 'contractHours'] as const;

  it('repos de 11 h entre deux shifts', () => {
    const alerts = computeLegalAlerts([shift('1', '2026-11-09', '18h00', '00h00'), shift('2', '2026-11-10', '09h00', '12h00')], [member()], monday, [...rules]);
    expect(alerts.some(a => a.ruleId === 'rest11h')).toBe(true);
  });
  it('10 h par jour et heures contractuelles', () => {
    const alerts = computeLegalAlerts([shift('1', '2026-11-09', '08h00', '20h00')], [member({ contractHours: 8 })], monday, [...rules]);
    expect(alerts.map(a => a.ruleId)).toEqual(expect.arrayContaining(['max10hDay', 'contractHours']));
  });
  it('moins de 2 jours de repos', () => {
    const week = Array.from({ length: 6 }, (_, i) => shift(`s${i}`, `2026-11-${String(9 + i).padStart(2, '0')}`, '10h00', '14h00'));
    expect(computeLegalAlerts(week, [member()], monday, ['restDays2']).map(a => a.ruleId)).toEqual(['restDays2']);
  });
});

describe('dates', () => {
  it('lundi et numéro de semaine ISO', () => {
    expect(mondayOfIso('2026-11-15')).toBe('2026-11-09');
    expect(isoWeekNumber('2026-11-09')).toBe(46);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
  });
});

describe('contexte du jour et rôles proposés', () => {
  const calendar = { zone: 'B', periods: [{ name: 'Toussaint', schoolYear: '2026-2027', start: '2026-10-17', end: '2026-11-01' }] } as unknown as SchoolHolidayCalendar;

  it('férié, vacances et événements', () => {
    const context = buildWeekDayContext(['2026-11-01', '2026-11-11', '2026-10-20'], calendar, [{ id: '1', date: '2026-10-20', label: 'Match' }]);
    expect(context['2026-11-11'].holiday).toBe('Armistice 1918');
    expect(context['2026-10-20']).toEqual({ holiday: null, vacation: true, events: ['Match'] });
    expect(context['2026-11-01'].holiday).not.toBeNull();
  });

  it('rôle proposé sans fiche, fiche enregistrée intacte', () => {
    const base = { hourlyRate: 10, forfaitJour: false };
    const candidates = [
      { ...base, key: 'A', nom: 'A', category: 'cadre' },
      { ...base, key: 'B', nom: 'B', category: 'niv12', department: 'cuisine' as const },
      { ...base, key: 'C', nom: 'C', category: 'niv3', department: 'salle' as const },
      { ...base, key: 'D', nom: 'D', category: 'niv3' },
      { ...base, key: 'E', nom: 'E', category: 'cadre' },
    ];
    const saved = [member({ key: 'E', nom: 'E', roles: [] })];
    const result = buildStaffMembers(candidates, saved, ['encadrement', 'salle', 'cuisine']);
    expect(result.map(m => m.roles)).toEqual([['encadrement'], ['cuisine'], ['salle'], [], []]);
    expect(buildStaffMembers(candidates.slice(2, 3), [], ['encadrement'])[0].roles).toEqual([]);
  });
});
