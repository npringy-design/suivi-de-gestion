import { describe, expect, it } from 'vitest';

import { dashboardColumns } from './dashboardColumns';
import {
  contextColumns,
  dailyPersonnelRows,
  dailyPersonnelTotals,
  editableCols,
  monthNames,
  tabs,
  viewModes,
} from './dashboardStaticConfig';
import {
  formatDashboardCurrency,
  formatDashboardNumber,
  formatDashboardPercent,
  parseDashboardNumber,
  parsePercentLikeValue,
} from './dashboardFormatters';
import { parseMoneyValue } from '@/lib/money';
import {
  getDashboardCellVarianceTone,
  isDashboardEventColumn,
  isDashboardHatchedColumn,
  isDashboardSupplierEditableColumn,
  isDashboardVarianceColumn,
} from './dashboardHelpers';

describe('dashboard shared model', () => {
  it('keeps key column indexes stable before wiring Dashboard.tsx', () => {
    expect(dashboardColumns[0]).toEqual(['CA', 'Midi Saisie', 'CA HT MIDI', 'bg-[#ffe699]']);
    expect(dashboardColumns[22]).toEqual(['REALISE', 'CA HT', 'ECART\nBUDGET', 'bg-white']);
    expect(dashboardColumns[31]).toEqual(['REALISE', 'COUVERTS\nRESTAURANT', 'ECART TM\nBUDGET', 'bg-[#fce4d6]']);
    expect(dashboardColumns[33]).toEqual(['REALISE', 'COUVERTS\nRESTAURANT', 'ECART\nBUDGET', 'bg-[#fce4d6]']);
    expect(dashboardColumns[45]).toEqual(['COUT MATIERE', 'ACHATS LIQUIDE HT', 'C10', 'bg-[#e2efda]']);
    expect(dashboardColumns[57]).toEqual(['COUT MATIERE', 'ACHATS SOLIDES HT', 'MARTEL', 'bg-[#e2efda]']);
    expect(dashboardColumns[76]).toEqual(['FRAIS DE PERSONNEL REALISE', '', 'TOTAL HEURES\nTRAVAILLEES', 'bg-white']);
    expect(dashboardColumns[109]).toEqual(['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white']);
    expect(dashboardColumns[110]).toEqual(['REALISE', 'CA HT LIMONADE', 'MIDI', 'bg-[#b4c6e7]']);
    expect(dashboardColumns[115]).toEqual(['REALISE', 'COUVERTS\nLIMONADE', 'SOIR\nMOY', 'bg-white']);
    expect(dashboardColumns[116]).toEqual(['REALISE', 'CA HT RESTAURANT', 'TOTAL', 'bg-[#b4c6e7]']);
    expect(dashboardColumns[129]).toEqual(['RESTAURANTS', 'ECART VS N-1', 'VALEUR', 'bg-white']);
    expect(dashboardColumns[130]).toEqual(['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'CADRE\n38,54 €', 'bg-[#fce4d6]']);
    expect(dashboardColumns[139]).toEqual(['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'APPRENTI\n8,39 €', 'bg-[#fce4d6]']);
    expect(dashboardColumns).toHaveLength(140);
  });

  it('keeps static dashboard config consistent', () => {
    expect(monthNames).toHaveLength(12);
    expect(monthNames[0]).toBe('janvier');
    expect(monthNames[11]).toBe('décembre');

    expect(tabs.map(tab => tab.id)).toEqual([
      'PREVISIONS',
      'REALISE',
      'COUT_MATIERE',
      'PERSONNEL',
      'FRAIS_GENERAUX',
      'RESULTATS',
    ]);
    expect(viewModes.map(mode => mode.id)).toEqual(['SAISIE', 'ANALYSE', 'COMPLET']);

    expect(editableCols).toContain(45);
    expect(editableCols).toContain(62);
    expect(editableCols).toContain(86);
    expect(editableCols).toContain(110);
    expect(contextColumns.has(22)).toBe(true);
    expect(dailyPersonnelRows[0]).toEqual(['Cadre', 77, 78]);
    expect(dailyPersonnelTotals[2]).toEqual({ label: 'Masse / CA', col: 89 });
  });

  it('formats and parses dashboard numbers safely', () => {
    expect(parseDashboardNumber('1 234,56')).toBe(1234.56);
    expect(parseDashboardNumber('')).toBe(0);
    expect(parseMoneyValue('1 234,56 €')).toBe(1234.56);
    expect(formatDashboardNumber(12.3)).toBe('12,30');
    expect(formatDashboardCurrency(12.3)).toBe('12,30 €');
    expect(formatDashboardPercent(12.3)).toBe('12,30%');
    expect(parsePercentLikeValue('12,30%')).toBe(12.3);
  });

  it('detects dashboard helper classifications', () => {
    expect(isDashboardVarianceColumn(dashboardColumns[22], 22)).toBe(true);
    expect(isDashboardVarianceColumn(dashboardColumns[0], 0)).toBe(false);
    expect(isDashboardHatchedColumn(dashboardColumns[5])).toBe(true);
    expect(isDashboardEventColumn(dashboardColumns[37])).toBe(true);
    expect(isDashboardSupplierEditableColumn(45)).toBe(true);
    expect(isDashboardSupplierEditableColumn(58)).toBe(false);
    expect(getDashboardCellVarianceTone('12,5')).toBe('positive');
    expect(getDashboardCellVarianceTone('-1,5')).toBe('negative');
    expect(getDashboardCellVarianceTone('0')).toBe('neutral');
  });
});
