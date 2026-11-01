import { useCallback, useEffect, useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { MONTH_NAMES } from '@/lib/constants';
import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import type { PlanManualOverride, PlanService, PlanSettings, PlanWriteMode } from '@/types/dataTypes';

import { collectDailySamples, toIsoDate } from '../../analyse/ecartsAnalysis';
import {
  applyOverrides,
  buildBudgetWrites,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  generatePlan,
  planMonthlyVae,
  planRows,
  planToCsv,
  PLAN_ROW_HEADER,
  proposeAnnualCA,
  proposeAnnualVAE,
  summarizeByMonth,
  withoutGrowth,
} from '../planningEngine';

const ALL_MONTHS = Array.from({ length: 12 }, (_, month) => month);

const downloadBlob = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadCsv = (fileName: string, content: string) => {
  downloadBlob(fileName, new Blob([content], { type: 'text/csv;charset=utf-8' }));
};

// Tout le calcul est une simulation en mémoire : rien n'est écrit dans allData avant confirmWrite.
export function usePlanification() {
  const { allData, loadYearFromCloud, importBudgetPlan, saveNow, companySettings } = useData();
  const [settings, setSettings] = useState<PlanSettings>(() => DEFAULT_PLAN_SETTINGS(new Date().getFullYear() + 1));
  const [overrides, setOverrides] = useState<Record<string, PlanManualOverride>>({});
  const [loadedYears, setLoadedYears] = useState<number[]>([]);
  const [status, setStatus] = useState('');

  const { targetYear } = settings;
  const holidayCalendar = useMemo(() => getSchoolHolidayCalendar(companySettings.schoolZone), [companySettings.schoolZone]);
  const baseYears = useMemo(() => [targetYear - 2, targetYear - 1], [targetYear]);

  // Charge depuis Supabase les années d'historique et l'année cible (détection des prévisions existantes).
  useEffect(() => {
    let cancelled = false;
    const years = [...baseYears, targetYear];
    void Promise.all(years.map(year => loadYearFromCloud(year))).then(() => {
      if (!cancelled) setLoadedYears(years);
    });
    return () => { cancelled = true; };
  }, [baseYears, targetYear, loadYearFromCloud]);

  const isLoading = !loadedYears.includes(targetYear) || !baseYears.every(year => loadedYears.includes(year));

  const samples = useMemo(() => {
    const now = new Date();
    const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
    const months = baseYears.flatMap(year => ALL_MONTHS.map(month => ({ year, month })));
    // budgetFallback : un mois d'historique (ex. nov./déc. de l'année en cours) sans réalisé
    // encore saisi utilise le budget de la même période plutôt que d'être ignoré.
    return collectDailySamples(allData, months, '0000-01-01', '9999-12-31', todayIso, true);
  }, [allData, baseYears]);

  const basePlan = useMemo(() => generatePlan(samples, holidayCalendar, settings), [samples, holidayCalendar, settings]);
  const plan = useMemo(() => applyOverrides(basePlan, overrides), [basePlan, overrides]);
  const annualProposal = useMemo(() => proposeAnnualCA(samples), [samples]);
  const vaeProposal = useMemo(() => proposeAnnualVAE(samples), [samples]);
  const vaeByMonth = useMemo(
    () => planMonthlyVae(samples, settings.targetAnnualVAE, settings.targetMonthlyVAE),
    [samples, settings.targetAnnualVAE, settings.targetMonthlyVAE],
  );
  const monthSummaries = useMemo(() => summarizeByMonth(plan), [plan]);
  // CA restaurant de chaque mois avant croissance : base du CA cible saisi dans le tableau mensuel.
  const baseCaByMonth = useMemo(() => Object.fromEntries(
    summarizeByMonth(generatePlan(samples, holidayCalendar, withoutGrowth(settings))).map(s => [s.month, s.caMidi + s.caSoir]),
  ), [samples, holidayCalendar, settings]);

  const existingByMonth = useMemo(() => detectExistingBudget(
    targetYear,
    Object.fromEntries(ALL_MONTHS.map(month => [month, allData[targetYear]?.[month]?.dashboard])),
  ), [allData, targetYear]);

  const updateSettings = useCallback((patch: Partial<PlanSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
    if (patch.targetYear !== undefined) {
      setOverrides({});
      setSettings(current => ({ ...current, targetAnnualCA: null, targetMonthlyCA: {}, targetAnnualVAE: null, targetMonthlyVAE: {} }));
    }
  }, []);

  // CA cible d'un mois : remplace la répartition automatique de ce mois seulement (null = retour à l'auto).
  const setMonthTarget = useCallback((month: number, value: number | null) => {
    setSettings(current => {
      const next = { ...current.targetMonthlyCA };
      if (value === null) delete next[month]; else next[month] = value;
      return { ...current, targetMonthlyCA: next };
    });
  }, []);

  const setMonthVae = useCallback((month: number, value: number | null) => {
    setSettings(current => {
      const next = { ...current.targetMonthlyVAE };
      if (value === null) delete next[month]; else next[month] = value;
      return { ...current, targetMonthlyVAE: next };
    });
  }, []);

  const setMonthGrowth = useCallback((key: 'cvGrowthByMonth' | 'tmIncreaseEurByMonth', month: number, value: number | null) => {
    setSettings(current => {
      const next = { ...current[key] };
      if (value === null) delete next[month]; else next[month] = value;
      return { ...current, [key]: next };
    });
  }, []);

  // Édition manuelle : couverts et TM sont les valeurs stockées ; le CA saisi redéduit les couverts (le TM ne baisse pas).
  const editService = useCallback((date: string, service: PlanService, field: 'cv' | 'tm' | 'ca', value: number) => {
    const day = plan.find(d => d.date === date);
    if (!day || !Number.isFinite(value) || value < 0) return;
    const current = day[service];
    let cv = current.cv;
    let tm = current.tm;
    if (field === 'cv') cv = Math.round(value);
    else if (field === 'tm') tm = value;
    else if (tm > 0) cv = Math.round(value / tm);
    else return;
    setOverrides(prev => ({ ...prev, [date]: { ...prev[date], [service]: { cv, tm } } }));
  }, [plan]);

  const clearOverride = useCallback((date: string) => {
    setOverrides(prev => {
      const { [date]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const exportCsv = useCallback(() => {
    downloadCsv(`planification-${targetYear}.csv`, planToCsv(plan));
  }, [plan, targetYear]);

  const exportXlsx = useCallback(async () => {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    const monthly = workbook.addWorksheet('Résumé mensuel');
    monthly.addRow([
      'Mois', 'Couverts midi', 'Couverts soir', 'CA midi', 'CA soir', 'CA cible avant croissance',
      'CA restaurant prévu', 'TM restaurant', 'VAE', 'TM avec VAE', 'Jours critiques', 'Jours faibles', 'Jours modifiés', 'Prévisions existantes',
    ]).font = { bold: true };
    monthSummaries.forEach(s => {
      const vae = vaeByMonth[s.month] ?? 0;
      const cv = s.cvMidi + s.cvSoir;
      const ca = s.caMidi + s.caSoir;
      monthly.addRow([
        MONTH_NAMES[s.month], s.cvMidi, s.cvSoir, s.caMidi, s.caSoir,
        settings.targetMonthlyCA[s.month] ?? Math.round(baseCaByMonth[s.month] ?? ca),
        ca, s.tm, vae, cv > 0 ? (ca + vae) / cv : null,
        s.daysCritique, s.daysFaible, s.daysManual, existingByMonth[s.month] ?? 0,
      ]);
    });
    ['D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => { monthly.getColumn(col).numFmt = '#,##0.00 €'; });

    const daily = workbook.addWorksheet('Jour par jour');
    daily.addRow([...PLAN_ROW_HEADER]).font = { bold: true };
    planRows(plan).forEach(r => daily.addRow([
      r.date, r.weekday, r.status, r.service, r.cv, r.tm, r.ca, r.confidence, r.n, r.source, r.estimator, r.manual,
    ]));
    daily.getColumn('F').numFmt = '#,##0.00 €';
    daily.getColumn('G').numFmt = '#,##0.00 €';

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(`planification-${targetYear}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }, [plan, targetYear, monthSummaries, vaeByMonth, settings.targetMonthlyCA, baseCaByMonth, existingByMonth]);

  const confirmWrite = useCallback(async (mode: PlanWriteMode) => {
    const dashboards = Object.fromEntries(ALL_MONTHS.map(month => [month, allData[targetYear]?.[month]?.dashboard]));
    const writes = buildBudgetWrites(targetYear, plan, dashboards, mode);
    importBudgetPlan(targetYear, writes.valuesByMonth);
    await saveNow();
    setStatus(
      `Prévisions ${targetYear} écrites : ${writes.daysWritten} jour(s) dont ${writes.daysOverwritten} écrasé(s), ${writes.daysSkipped} conservé(s).`,
    );
  }, [allData, plan, targetYear, importBudgetPlan, saveNow]);

  return {
    settings, updateSettings, setMonthGrowth, setMonthTarget, annualProposal, baseCaByMonth, vaeProposal, vaeByMonth, setMonthVae,
    plan, monthSummaries, overrides, editService, clearOverride,
    existingByMonth, isLoading, status,
    exportCsv, exportXlsx, confirmWrite,
    holidayZone: holidayCalendar.zone,
    sampleCount: samples.length,
    baseYears,
    targetYearOptions: [0, 1, 2, 3].map(offset => new Date().getFullYear() + offset),
  };
}
