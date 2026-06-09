import { describe, it, expect } from 'vitest';

import {
  isDateInRange,
  isExactDate,
  isPayrollInputColumn,
  parsePayrollHourForCalculation,
  formatPayrollHourVisualValue,
  formatKpiCurrency,
  formatKpiNumber,
} from '@/features/dashboard/dashboardCalculations';

describe('isDateInRange', () => {
  it('retourne true si la date est dans la plage', () => {
    expect(isDateInRange(new Date('2026-03-15'), '2026-03-01', '2026-03-31')).toBe(true);
  });

  it('retourne true aux bornes', () => {
    expect(isDateInRange(new Date('2026-03-01'), '2026-03-01', '2026-03-31')).toBe(true);
    expect(isDateInRange(new Date('2026-03-31'), '2026-03-01', '2026-03-31')).toBe(true);
  });

  it('retourne false hors plage', () => {
    expect(isDateInRange(new Date('2026-04-01'), '2026-03-01', '2026-03-31')).toBe(false);
  });
});

describe('isExactDate', () => {
  it('retourne true pour la meme date', () => {
    expect(isExactDate(new Date('2026-06-09'), '2026-06-09')).toBe(true);
  });

  it('retourne false pour une date differente', () => {
    expect(isExactDate(new Date('2026-06-10'), '2026-06-09')).toBe(false);
  });
});

describe('isPayrollInputColumn', () => {
  it('retourne true dans la plage 62-71', () => {
    expect(isPayrollInputColumn(62)).toBe(true);
    expect(isPayrollInputColumn(71)).toBe(true);
  });

  it('retourne true dans la plage 77-86', () => {
    expect(isPayrollInputColumn(77)).toBe(true);
    expect(isPayrollInputColumn(86)).toBe(true);
  });

  it('retourne false hors plages', () => {
    expect(isPayrollInputColumn(61)).toBe(false);
    expect(isPayrollInputColumn(72)).toBe(false);
    expect(isPayrollInputColumn(76)).toBe(false);
    expect(isPayrollInputColumn(87)).toBe(false);
  });
});

describe('parsePayrollHourForCalculation', () => {
  it('convertit "7h30" en 7.5', () => {
    expect(parsePayrollHourForCalculation('7h30')).toBe(7.5);
  });

  it('retourne 0 pour undefined, null ou chaine vide', () => {
    expect(parsePayrollHourForCalculation(undefined)).toBe(0);
    expect(parsePayrollHourForCalculation('')).toBe(0);
  });

  it('retourne 0 pour une valeur negative', () => {
    expect(parsePayrollHourForCalculation(-5)).toBe(0);
  });

  it('accepte un nombre directement', () => {
    expect(parsePayrollHourForCalculation(8)).toBe(8);
  });
});

describe('formatPayrollHourVisualValue', () => {
  it('affiche "7h30" pour 7.5', () => {
    expect(formatPayrollHourVisualValue(7.5)).toBe('7h30');
  });

  it('affiche "8h05" pour "8h05"', () => {
    expect(formatPayrollHourVisualValue('8h05')).toBe('8h05');
  });

  it('retourne chaine vide pour undefined', () => {
    expect(formatPayrollHourVisualValue(undefined)).toBe('');
  });
});

describe('formatKpiCurrency', () => {
  it('retourne "-" pour 0', () => {
    expect(formatKpiCurrency(0)).toBe('-');
  });

  it('contient le symbole euro pour une valeur non nulle', () => {
    const result = formatKpiCurrency(1500);
    expect(result).toContain('€');
    expect(result).toContain('1');
  });
});

describe('formatKpiNumber', () => {
  it('retourne "-" pour 0', () => {
    expect(formatKpiNumber(0)).toBe('-');
  });

  it('formate un entier positif', () => {
    const result = formatKpiNumber(250);
    expect(result).toBe('250');
  });
});
