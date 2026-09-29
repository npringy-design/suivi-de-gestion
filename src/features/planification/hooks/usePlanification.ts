import { useCallback, useEffect, useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import type { PlanManualOverride, PlanService, PlanSettings, PlanWriteMode } from '@/types/dataTypes';

import { collectDailySamples, toIsoDate } from '../../analyse/ecartsAnalysis';
import {
  applyOverrides,
  buildBudgetWrites,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  generatePlan,
  planToCsv,
  summarizeByMonth,
} from '../planningEngine';

const ALL_MONTHS = Array.from({ length: 12 }, (_, month) => month);

const downloadCsv = (fileName: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
    return collectDailySamples(allData, months, '0000-01-01', '9999-12-31', todayIso);
  }, [allData, baseYears]);

  const basePlan = useMemo(() => generatePlan(samples, holidayCalendar, settings), [samples, holidayCalendar, settings]);
  const plan = useMemo(() => applyOverrides(basePlan, overrides), [basePlan, overrides]);
  const monthSummaries = useMemo(() => summarizeByMonth(plan), [plan]);

  const existingByMonth = useMemo(() => detectExistingBudget(
    targetYear,
    Object.fromEntries(ALL_MONTHS.map(month => [month, allData[targetYear]?.[month]?.dashboard])),
  ), [allData, targetYear]);

  const updateSettings = useCallback((patch: Partial<PlanSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
    if (patch.targetYear !== undefined) setOverrides({});
  }, []);

  const setMonthGrowth = useCallback((key: 'cvGrowthByMonth' | 'tmGrowthByMonth', month: number, value: number | null) => {
    setSettings(current => {
      const next = { ...current[key] };
      if (value === null) delete next[month]; else next[month] = value;
      return { ...current, [key]: next };
    });
  }, []);

  // Édition manuelle : couverts et TM sont les valeurs stockées ; le CA saisi redéduit le TM.
  const editService = useCallback((date: string, service: PlanService, field: 'cv' | 'tm' | 'ca', value: number) => {
    const day = plan.find(d => d.date === date);
    if (!day || !Number.isFinite(value) || value < 0) return;
    const current = day[service];
    let cv = current.cv;
    let tm = current.tm;
    if (field === 'cv') cv = Math.round(value);
    else if (field === 'tm') tm = value;
    else if (cv > 0) tm = Math.round((value / cv) * 100) / 100;
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
    settings, updateSettings, setMonthGrowth,
    plan, monthSummaries, overrides, editService, clearOverride,
    existingByMonth, isLoading, status,
    exportCsv, confirmWrite,
    holidayZone: holidayCalendar.zone,
    sampleCount: samples.length,
    baseYears,
    targetYearOptions: [0, 1, 2, 3].map(offset => new Date().getFullYear() + offset),
  };
}
