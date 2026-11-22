import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { useHasLimonade } from '@/lib/useHasLimonade';
import { MONTH_NAMES } from '@/lib/constants';
import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import type { CompanySettings, PlanDraft, PlanManualOverride, PlanService, PlanSettings, PlanWriteMode } from '@/types/dataTypes';

import { collectDailySamples, toIsoDate } from '../../analyse/ecartsAnalysis';
import { excelMonthSheetName, fillExcelPasteSheet } from '../excelPasteSheet';
import {
  applyOverrides,
  buildBudgetWrites,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  generatePlan,
  planHasLimonade,
  planLimonadeDays,
  planMonthlyLimonade,
  planRows,
  planToCsv,
  PLAN_ROW_HEADER,
  PLAN_ROW_HEADER_LIMONADE,
  proposeAnnualCA,
  proposeAnnualLimonade,
  summarizeByMonth,
  summarizeLimonade,
  withLimonadeDays,
  withoutGrowth,
} from '../planningEngine';

const ALL_MONTHS = Array.from({ length: 12 }, (_, month) => month);

const DRAFT_SAVE_DELAY_MS = 800;

type DraftState = { settings: PlanSettings; overrides: Record<string, PlanManualOverride> };

// Brouillon stocké de l'année, fusionné sur les valeurs par défaut (anciens brouillons : champs manquants ou obsolètes).
const draftStateFor = (drafts: CompanySettings['planDrafts'], year: number): DraftState => {
  const draft = drafts?.[String(year)];
  if (!draft) return { settings: DEFAULT_PLAN_SETTINGS(year), overrides: {} };
  const { targetAnnualVAE: _obsolete, ...stored } = draft.settings as PlanSettings & { targetAnnualVAE?: unknown };
  return { settings: { ...DEFAULT_PLAN_SETTINGS(year), ...stored, targetYear: year }, overrides: draft.overrides ?? {} };
};

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
  const { allData, loadYearFromCloud, importBudgetPlan, saveNow, companySettings, updateCompanySettings } = useData();
  const hasLimonade = useHasLimonade();
  // État restauré : tant que settings/overrides en sont les mêmes objets, l'utilisateur n'a rien modifié (aucune écriture).
  const restoredRef = useRef<DraftState>(draftStateFor(companySettings.planDrafts, new Date().getFullYear() + 1));
  const [settings, setSettings] = useState<PlanSettings>(restoredRef.current.settings);
  const [overrides, setOverrides] = useState<Record<string, PlanManualOverride>>(restoredRef.current.overrides);
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
    return collectDailySamples(allData, months, '0000-01-01', '9999-12-31', todayIso, true, hasLimonade);
  }, [allData, baseYears, hasLimonade]);

  const basePlan = useMemo(() => generatePlan(samples, holidayCalendar, settings), [samples, holidayCalendar, settings]);
  // Jours de l'historique avec CA limonade mais sans couverts (par année) : exclus du TM limonade.
  const limonadeWithoutCovers = useMemo(() => {
    if (!hasLimonade) return [];
    const byYear = new Map<number, number>();
    samples.forEach(sample => {
      if (sample.reel.caLimo > 0 && sample.reel.cvLimo === 0) {
        const year = Number(sample.date.slice(0, 4));
        byYear.set(year, (byYear.get(year) ?? 0) + 1);
      }
    });
    return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, days]) => ({ year, days }));
  }, [hasLimonade, samples]);
  const limonadeProposal = useMemo(() => proposeAnnualLimonade(samples), [samples]);
  const limonadeByMonth = useMemo(
    () => planMonthlyLimonade(samples, settings.targetAnnualLimonade, settings.targetMonthlyLimonade),
    [samples, settings.targetAnnualLimonade, settings.targetMonthlyLimonade],
  );
  // La limonade est répartie au jour à part : elle n'entre jamais dans le plan restaurant.
  const limonadeDays = useMemo(
    () => (hasLimonade ? planLimonadeDays(samples, holidayCalendar, targetYear, limonadeByMonth) : {}),
    [hasLimonade, samples, holidayCalendar, targetYear, limonadeByMonth],
  );
  const plan = useMemo(() => {
    const restaurantPlan = applyOverrides(basePlan, overrides);
    return hasLimonade ? withLimonadeDays(restaurantPlan, limonadeDays) : restaurantPlan;
  }, [basePlan, overrides, hasLimonade, limonadeDays]);
  const annualProposal = useMemo(() => proposeAnnualCA(samples), [samples]);
  // VAE saisie à la main (reprise du suivi Excel), 0 par défaut : aucune proposition automatique.
  const vaeByMonth = useMemo(() => Object.fromEntries(ALL_MONTHS.map(month => {
    const value = settings.targetMonthlyVAE[month];
    return [month, typeof value === 'number' ? value : 0];
  })) as Record<number, number>, [settings.targetMonthlyVAE]);
  const monthSummaries = useMemo(() => summarizeByMonth(plan), [plan]);
  const limonadeSummary = useMemo(() => summarizeLimonade(plan), [plan]);
  // CA restaurant de chaque mois avant croissance : base du CA cible saisi dans le tableau mensuel.
  const baseCaByMonth = useMemo(() => Object.fromEntries(
    summarizeByMonth(generatePlan(samples, holidayCalendar, withoutGrowth(settings))).map(s => [s.month, s.caMidi + s.caSoir]),
  ), [samples, holidayCalendar, settings]);

  const existingByMonth = useMemo(() => detectExistingBudget(
    targetYear,
    Object.fromEntries(ALL_MONTHS.map(month => [month, allData[targetYear]?.[month]?.dashboard])),
  ), [allData, targetYear]);

  // --- Brouillon cloud (companySettings.planDrafts), par année cible ---
  const companySettingsRef = useRef(companySettings);
  companySettingsRef.current = companySettings;
  const pendingRef = useRef<{ year: number; draft: DraftState } | null>(null);
  const timerRef = useRef<number | null>(null);

  const writeDraft = useCallback((year: number, draft: DraftState) => {
    const current = companySettingsRef.current;
    const stored = current.planDrafts?.[String(year)];
    if (stored && JSON.stringify({ settings: stored.settings, overrides: stored.overrides }) === JSON.stringify(draft)) return;
    const next: PlanDraft = { ...draft, savedAt: new Date().toISOString() };
    const planDrafts = { ...current.planDrafts, [String(year)]: next };
    companySettingsRef.current = { ...current, planDrafts };
    updateCompanySettings(companySettingsRef.current);
  }, [updateCompanySettings]);

  const flushDraft = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) writeDraft(pending.year, pending.draft);
  }, [writeDraft]);

  // Enregistrement automatique 800 ms après la dernière modification (jamais tant que rien n'a été modifié depuis la restauration).
  useEffect(() => {
    if (settings === restoredRef.current.settings && overrides === restoredRef.current.overrides) return;
    pendingRef.current = { year: settings.targetYear, draft: { settings, overrides } };
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flushDraft, DRAFT_SAVE_DELAY_MS);
  }, [settings, overrides, flushDraft]);

  // Sortie de la page : écrit ce qui est encore en attente.
  useEffect(() => flushDraft, [flushDraft]);

  // Brouillon arrivé après le montage (chargement cloud, autre appareil) : restauré tant que rien n'a été modifié.
  const storedDraft = companySettings.planDrafts?.[String(targetYear)];
  useEffect(() => {
    if (settings !== restoredRef.current.settings || overrides !== restoredRef.current.overrides) return;
    const next = draftStateFor(companySettings.planDrafts, targetYear);
    if (JSON.stringify(next) === JSON.stringify(restoredRef.current)) return;
    restoredRef.current = next;
    setSettings(next.settings);
    setOverrides(next.overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul un changement du brouillon stocké déclenche la restauration
  }, [storedDraft]);

  const updateSettings = useCallback((patch: Partial<PlanSettings>) => {
    if (patch.targetYear !== undefined) {
      flushDraft();
      const next = draftStateFor(companySettingsRef.current.planDrafts, patch.targetYear);
      restoredRef.current = next;
      setSettings(next.settings);
      setOverrides(next.overrides);
      return;
    }
    setSettings(current => ({ ...current, ...patch }));
  }, [flushDraft]);

  const resetDraft = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    pendingRef.current = null;
    const current = companySettingsRef.current;
    const { [String(targetYear)]: _removed, ...rest } = current.planDrafts ?? {};
    companySettingsRef.current = { ...current, planDrafts: rest };
    updateCompanySettings(companySettingsRef.current);
    const defaults = { settings: DEFAULT_PLAN_SETTINGS(targetYear), overrides: {} };
    restoredRef.current = defaults;
    setSettings(defaults.settings);
    setOverrides(defaults.overrides);
  }, [targetYear, updateCompanySettings]);

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

  const setMonthLimonade = useCallback((month: number, value: number | null) => {
    setSettings(current => {
      const next = { ...current.targetMonthlyLimonade };
      if (value === null) delete next[month]; else next[month] = value;
      return { ...current, targetMonthlyLimonade: next };
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
    const withLimonade = planHasLimonade(plan);
    monthly.addRow([
      'Mois', 'Couverts midi', 'Couverts soir', 'CA midi', 'CA soir', 'CA cible avant croissance',
      'CA restaurant prévu', 'TM restaurant', 'VAE', 'TM avec VAE', 'Jours critiques', 'Jours faibles', 'Jours modifiés', 'Prévisions existantes',
      ...(withLimonade ? ['CA limonade', 'CA total prévu'] : []),
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
        ...(withLimonade ? [limonadeByMonth[s.month] ?? 0, ca + vae + (limonadeByMonth[s.month] ?? 0)] : []),
      ]);
    });
    ['D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => { monthly.getColumn(col).numFmt = '#,##0.00 €'; });
    if (withLimonade) ['O', 'P'].forEach(col => { monthly.getColumn(col).numFmt = '#,##0.00 €'; });

    const daily = workbook.addWorksheet('Jour par jour');
    daily.addRow([...(withLimonade ? PLAN_ROW_HEADER_LIMONADE : PLAN_ROW_HEADER)]).font = { bold: true };
    planRows(plan).forEach(r => daily.addRow([
      r.date, r.weekday, r.status, r.service, r.cv, r.tm, r.ca, r.confidence, r.n, r.source, r.estimator, r.manual,
      ...(withLimonade ? [r.limonade?.cv ?? null, r.limonade?.tm ?? null, r.limonade?.ca ?? null] : []),
    ]));
    daily.getColumn('F').numFmt = '#,##0.00 €';
    daily.getColumn('G').numFmt = '#,##0.00 €';
    if (withLimonade) ['N', 'O'].forEach(col => { daily.getColumn(col).numFmt = '#,##0.00 €'; });

    for (let month = 0; month < 12; month += 1) {
      const days = plan.filter(day => day.month === month);
      if (days.length === 0) continue;
      fillExcelPasteSheet(workbook.addWorksheet(excelMonthSheetName(targetYear, month)), targetYear, month, days, withLimonade);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(`planification-${targetYear}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }, [plan, targetYear, monthSummaries, vaeByMonth, limonadeByMonth, settings.targetMonthlyCA, baseCaByMonth, existingByMonth]);

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
    settings, updateSettings, setMonthGrowth, setMonthTarget, annualProposal, baseCaByMonth, vaeByMonth, setMonthVae,
    savedAt: storedDraft?.savedAt ?? null, resetDraft,
    limonadeProposal, limonadeByMonth, limonadeSummary, limonadeWithoutCovers, setMonthLimonade, hasLimonade,
    plan, monthSummaries, overrides, editService, clearOverride,
    existingByMonth, isLoading, status,
    exportCsv, exportXlsx, confirmWrite,
    holidayZone: holidayCalendar.zone,
    sampleCount: samples.length,
    baseYears,
    targetYearOptions: [0, 1, 2, 3].map(offset => new Date().getFullYear() + offset),
  };
}
