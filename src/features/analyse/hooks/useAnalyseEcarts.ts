import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { loadJsonFromBrowserStorage, saveJsonToBrowserStorage } from '@/lib/browserStorage';
import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import type {
  AnalyseAggregate,
  AnalyseDetail,
  AnalyseFilters,
  AnalyseThresholds,
  AnalyseWeekdayRow,
} from '@/types/dataTypes';

import {
  aggregateByWeekday,
  aggregateDetail,
  aggregateService,
  collectDailySamples,
  filterSamples,
  resolvePeriod,
  toIsoDate,
} from '../ecartsAnalysis';

const THRESHOLDS_STORAGE_KEY = 'analyse_ecarts_thresholds_v1';
const DEFAULT_THRESHOLDS: AnalyseThresholds = { ecartPct: -15, ecartEuroJour: -100 };

const defaultFilters = (): AnalyseFilters => {
  const year = new Date().getFullYear();
  return {
    periodMode: 'plage',
    startDate: toIsoDate(year, 0, 1),
    endDate: toIsoDate(year, 11, 31),
    monthKeys: [],
    weekdays: [],
    service: 'journee',
    vacationMode: 'all',
  };
};

const loadThresholds = (): AnalyseThresholds => {
  const stored = loadJsonFromBrowserStorage<Partial<AnalyseThresholds>>(THRESHOLDS_STORAGE_KEY, {});
  return {
    ecartPct: Number.isFinite(stored.ecartPct) ? Number(stored.ecartPct) : DEFAULT_THRESHOLDS.ecartPct,
    ecartEuroJour: Number.isFinite(stored.ecartEuroJour) ? Number(stored.ecartEuroJour) : DEFAULT_THRESHOLDS.ecartEuroJour,
  };
};

export type AnalyseEcartsResults = {
  summary: AnalyseAggregate;
  detail: AnalyseDetail;
  weekdayRows: AnalyseWeekdayRow[];
  sampleCount: number;
};

export function useAnalyseEcarts() {
  const { allData, loadYearFromCloud, companySettings } = useData();
  const holidayCalendar = useMemo(() => getSchoolHolidayCalendar(companySettings.schoolZone), [companySettings.schoolZone]);
  const [filters, setFilters] = useState<AnalyseFilters>(defaultFilters);
  const [thresholds, setThresholdsState] = useState<AnalyseThresholds>(loadThresholds);
  const requestedYearsRef = useRef(new Set<number>());

  const period = useMemo(() => resolvePeriod(filters), [filters]);

  // Charge depuis Supabase les années de la période absentes en local (même mécanisme que RecapAnnuel).
  useEffect(() => {
    const years = new Set(period.months.map(ref => ref.year));
    years.forEach(year => {
      if (allData[year] || requestedYearsRef.current.has(year)) return;
      requestedYearsRef.current.add(year);
      void loadYearFromCloud(year);
    });
  }, [period, allData, loadYearFromCloud]);

  const updateFilters = useCallback((patch: Partial<AnalyseFilters>) => {
    setFilters(current => ({ ...current, ...patch }));
  }, []);

  const setThresholds = useCallback((next: AnalyseThresholds) => {
    setThresholdsState(next);
    saveJsonToBrowserStorage(THRESHOLDS_STORAGE_KEY, next);
  }, []);

  const results = useMemo<AnalyseEcartsResults>(() => {
    const now = new Date();
    const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
    const samples = collectDailySamples(allData, period.months, period.startIso, period.endIso, todayIso);
    const filtered = filterSamples(samples, filters, holidayCalendar);
    return {
      summary: aggregateService(filtered, filters.service),
      detail: aggregateDetail(filtered),
      weekdayRows: aggregateByWeekday(filtered, filters.weekdays),
      sampleCount: filtered.length,
    };
  }, [allData, period, filters, holidayCalendar]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear - 1, currentYear, currentYear + 1]);
    Object.keys(allData).forEach(year => years.add(Number(year)));
    return [...years].filter(Number.isFinite).sort((a, b) => a - b);
  }, [allData]);

  return { filters, updateFilters, thresholds, setThresholds, results, availableYears, holidayCalendar };
}
