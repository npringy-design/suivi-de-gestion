import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';

import { fetchCloudAppBootstrap, fetchCloudMonth, fetchCloudYearMonths, isCloudSyncConfigured, saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';
import { mergeEdgMensuelBudgetData, normalizeMonthData, updateDailyChannelData, updateMonthlyStringRecordData, type DailyChannelKey, type DailyChannelValue } from './dataContextUpdateHelpers';
import { parseMoneyValue } from '@/lib/money';
import { createDefaultEdgChargesConfig } from '@/features/edg/edgChargesConfigDefaults';

export type {
  DayDataTheorique,
  DayDataNepting,
  DayDataEspeces,
  DayDataConecs,
  AncvEntry,
  DayDataAncvPapiers,
  TrEntry,
  DayDataSaisieTR,
  DayDataVisuTRPapiers,
  DayDataSunday,
  DayDataUber,
  DayDataAmexAncv,
  DayDataDeliveroo,
  DayDataClickCollect,
  DayDataBilanSynthese,
  AchatEntry,
  AlimentationEntry,
  MonthDataDepensesPetiteCaisse,
  VirementEntry,
  MonthDataMiseEnPaiement,
  Config2025Data,
  EdgChargesConfig,
  EdgChargeConfig,
  CustomEvent,
  SalarieRow,
  MonthDataSalariesConfig,
  PersonnelCategory,
  PersonnelDepartment,
  PersonnelInfo,
  MonthData,
  PersonnelSchema,
} from '@/types/dataTypes';

import type {
  DayDataTheorique,
  DayDataNepting,
  DayDataEspeces,
  DayDataConecs,
  AncvEntry,
  DayDataAncvPapiers,
  TrEntry,
  DayDataSaisieTR,
  DayDataVisuTRPapiers,
  DayDataSunday,
  DayDataUber,
  DayDataAmexAncv,
  DayDataDeliveroo,
  DayDataClickCollect,
  DayDataBilanSynthese,
  AchatEntry,
  AlimentationEntry,
  MonthDataDepensesPetiteCaisse,
  VirementEntry,
  MonthDataMiseEnPaiement,
  Config2025Data,
  EdgChargesConfig,
  EdgChargeConfig,
  CustomEvent,
  SalarieRow,
  MonthDataSalariesConfig,
  PersonnelCategory,
  PersonnelDepartment,
  PersonnelInfo,
  MonthData,
  PersonnelSchema,
} from '@/types/dataTypes';

type DataContextType = {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  data: Record<number, MonthData>;
  allData: Record<number, Record<number, MonthData>>;
  updateTheorique: (month: number, day: number, field: keyof DayDataTheorique, value: string | number) => void;
  updateNepting: (month: number, day: number, field: keyof DayDataNepting, value: string | number) => void;
  updateEspeces: (month: number, day: number, field: keyof DayDataEspeces, value: string | number) => void;
  updateConecs: (month: number, day: number, field: keyof DayDataConecs, value: string | number) => void;
  updateAncvPapiers: (month: number, day: number, field: keyof DayDataAncvPapiers, value: string | number) => void;
  updateAncvLigne: (month: number, day: number, index: number, field: keyof AncvEntry, value: string) => void;
  updateSaisieTR: (month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string | number) => void;
  updateVisuTRPapiers: (month: number, day: number, field: keyof DayDataVisuTRPapiers, value: string) => void;
  updateSunday: (month: number, day: number, field: keyof DayDataSunday, value: string | number) => void;
  updateUber: (month: number, day: number, field: keyof DayDataUber, value: string | number) => void;
  updateAmexAncv: (month: number, day: number, field: keyof DayDataAmexAncv, value: string | number) => void;
  updateDeliveroo: (month: number, day: number, field: keyof DayDataDeliveroo, value: string | number) => void;
  updateClickCollect: (month: number, day: number, field: keyof DayDataClickCollect, value: string | number) => void;
  updateBilanSynthese: (month: number, day: number, field: keyof DayDataBilanSynthese, value: string | number) => void;
  updateDepensesPetiteCaisse: (month: number, field: keyof MonthDataDepensesPetiteCaisse | string, value: string | number) => void;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuel: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuelRealise: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuelN1: (month: number, cellKey: string, value: string) => void;
  importEdgBudget: (valuesByMonth: Record<number, Record<string, string>>) => void;
  updateMiseEnPaiement: (month: number, period: 'period1' | 'period2', index: number, field: keyof VirementEntry, value: string | number | boolean) => void;
  updateSalariesConfig: (month: number, data: MonthDataSalariesConfig) => void;
  updatePersonnelSchema: (month: number, schema: PersonnelSchema) => void;
  markMonthsAsLoaded: (year: number, months: number[]) => void;
  loadYearFromCloud: (year: number) => Promise<void>;
  saveNow: () => Promise<void>;
  config2025: Config2025Data;
  updateConfig2025: (type: 'mensuel' | 'hebdo', index: number, field: string, value: string) => void;
  edgChargesConfig: EdgChargesConfig;
  updateEdgChargesConfig: (key: string, config: EdgChargeConfig) => void;
  customEvents: CustomEvent[];
  addCustomEvent: (event: CustomEvent) => void;
  removeCustomEvent: (id: string) => void;
  personnelInfos: PersonnelInfo[];
  updatePersonnelInfos: (rows: PersonnelInfo[]) => void;
  resetLocalData: () => void;
};

const STORAGE_KEY_V2 = 'gestion_data_v2';
const PERSONNEL_INFOS_STORAGE_KEY = 'personnel_infos_v1';
const CONFIG_2025_STORAGE_KEY = 'config2025_data_v1';
const CUSTOM_EVENTS_STORAGE_KEY = 'custom_events_v1';
const EDG_CHARGES_CONFIG_STORAGE_KEY = 'edg_charges_config_v1';

const DEFAULT_THEORIQUE_DAY: DayDataTheorique = {
  total_ca: 0, cb: 0, amex: 0, tr_papier: 0, tr_carte: 0, ancv: 0,
  especes: 0, click_collect: 0, uber: 0, deliveroo: 0, sunday: 0, commentaire: '',
};
const DEFAULT_NEPTING_DAY: DayDataNepting = { saisie_reel_nepting: 0, pourboire_sunday: 0, commentaire: '' };
const DEFAULT_ESPECES_DAY: DayDataEspeces = { mis_au_coffre: 0, pieces: 0, commentaire: '' };
const DEFAULT_CONECS_DAY: DayDataConecs = { conecs_reel_nepting: 0, commentaire: '' };
const DEFAULT_ANCV_PAPIERS_DAY: DayDataAncvPapiers = { nombre_ancv: '', montant_total: 0, n_bordereaux: '', nbre_ancv_enveloppes: '', total_enveloppes_ancv: 0, commentaire: '' };
const DEFAULT_VISU_TR_PAPIERS_DAY: DayDataVisuTRPapiers = { n_bordereaux: '', nbre_tr_enveloppes: '', total_enveloppes_tr: '', commentaire: '' };
const DEFAULT_REEL_DAY: DayDataSunday = { reel: 0, commentaire: '' };
const DEFAULT_AMEX_ANCV_DAY: DayDataAmexAncv = { reel_nepting: 0, commentaire: '' };
const DEFAULT_BILAN_DAY: DayDataBilanSynthese = { ttc_5_5: 0, ttc_10: 0, ttc_20: 0 };

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage peut etre indisponible ou plein.
  }
};

const loadFromStorage = (): Record<number, Record<number, MonthData>> => {
  const savedV2 = loadJson<Record<number, Record<number, MonthData>> | null>(STORAGE_KEY_V2, null);
  if (savedV2) return savedV2;

  const savedV1 = loadJson<Record<number, MonthData> | null>('gestion_data_v1', null);
  return savedV1 ? { 2026: savedV1 } : {};
};

const saveToStorage = (data: Record<number, Record<number, MonthData>>) => saveJson(STORAGE_KEY_V2, data);

const EMPTY_YEAR_DATA: Record<number, MonthData> = {};

type CloudSnapshot = {
  allData: Record<number, Record<number, MonthData>>;
  config2025: Config2025Data;
  customEvents: CustomEvent[];
  personnelInfos: PersonnelInfo[];
  edgChargesConfig: EdgChargesConfig;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [allData, setAllData] = useState<Record<number, Record<number, MonthData>>>(loadFromStorage);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [config2025, setConfig2025] = useState<Config2025Data>(() => loadJson(CONFIG_2025_STORAGE_KEY, { mensuel: {}, hebdo: {} }));
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => loadJson(CUSTOM_EVENTS_STORAGE_KEY, []));
  const [personnelInfos, setPersonnelInfos] = useState<PersonnelInfo[]>(() => loadJson(PERSONNEL_INFOS_STORAGE_KEY, []));
  const [edgChargesConfig, setEdgChargesConfig] = useState<EdgChargesConfig>(() => loadJson(EDG_CHARGES_CONFIG_STORAGE_KEY, createDefaultEdgChargesConfig()));

  const data = allData[selectedYear] || EMPTY_YEAR_DATA;

  const cloudLoadedRef = useRef(!isCloudSyncConfigured);
  const cloudBootstrapDoneRef = useRef(!isCloudSyncConfigured);
  const cloudApplyingRef = useRef(false);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const loadedCloudMonthKeysRef = useRef<Set<string>>(new Set());
  const initialCloudYearRef = useRef(selectedYear);
  const initialCloudMonthRef = useRef(selectedMonth);
  // Snapshots "annee:mois" modifiés localement : seuls ces mois sont poussés vers Supabase,
  // pour ne jamais écraser avec des données localStorage périmées les saisies d'un autre poste.
  const dirtyMonthKeysRef = useRef<Set<string>>(new Set());
  const dirtySegmentsRef = useRef({ config2025: false, customEvents: false, personnelInfos: false, edgChargesConfig: false });
  const latestSnapshotRef = useRef<CloudSnapshot>({ allData, config2025, customEvents, personnelInfos, edgChargesConfig });

  const updateDataForYear = useCallback((month: number, updater: (prevYearData: Record<number, MonthData>) => Record<number, MonthData>) => {
    dirtyMonthKeysRef.current.add(selectedYear + ':' + month);
    setAllData(prev => ({
      ...prev,
      [selectedYear]: updater(prev[selectedYear] || {}),
    }));
  }, [selectedYear]);

  const cloudMonthKey = useCallback((year: number, month: number) => year + ':' + month, []);

  const rememberLoadedCloudMonths = useCallback((cloudState: CloudAppState) => {
    if (!cloudState.allData || typeof cloudState.allData !== 'object') return;

    Object.entries(cloudState.allData as Record<string, Record<string, unknown>>).forEach(([year, months]) => {
      if (!months || typeof months !== 'object') return;
      Object.keys(months).forEach(month => loadedCloudMonthKeysRef.current.add(year + ':' + month));
    });
  }, []);

  const cloudErrorMessage = useCallback((prefix: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error || 'erreur inconnue');
    return prefix + ' : ' + detail.slice(0, 220);
  }, []);

  const showCloudWarning = useCallback((message: string) => {
    if (typeof document === 'undefined') return;
    const id = 'suivi-gestion-cloud-warning';
    let banner = document.getElementById(id);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = id;
      banner.setAttribute('role', 'alert');
      banner.style.position = 'fixed';
      banner.style.left = '50%';
      banner.style.bottom = '18px';
      banner.style.transform = 'translateX(-50%)';
      banner.style.zIndex = '99999';
      banner.style.maxWidth = 'calc(100vw - 32px)';
      banner.style.padding = '12px 16px';
      banner.style.borderRadius = '14px';
      banner.style.background = '#7f1d1d';
      banner.style.color = '#fff';
      banner.style.boxShadow = '0 18px 45px rgba(15, 23, 42, 0.35)';
      banner.style.fontFamily = 'system-ui, sans-serif';
      banner.style.fontSize = '13px';
      banner.style.fontWeight = '700';
      banner.style.textAlign = 'center';
      banner.style.whiteSpace = 'normal';
      document.body.appendChild(banner);
    }
    banner.textContent = message;
  }, []);

  const hideCloudWarning = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('suivi-gestion-cloud-warning')?.remove();
  }, []);

  const applyCloudState = useCallback((cloudState: CloudAppState) => {
    cloudApplyingRef.current = true;
    rememberLoadedCloudMonths(cloudState);

    if (cloudState.allData && typeof cloudState.allData === 'object') {
      setAllData(prev => {
        const incoming = cloudState.allData as Record<number, Record<number, MonthData>>;
        const merged: Record<number, Record<number, MonthData>> = { ...prev };
        Object.entries(incoming).forEach(([year, months]) => {
          if (!months || typeof months !== 'object') return;
          merged[Number(year)] = { ...(merged[Number(year)] || {}), ...(months as Record<number, MonthData>) };
        });
        return merged;
      });
    }
    if (cloudState.config2025 && typeof cloudState.config2025 === 'object') {
      setConfig2025(cloudState.config2025 as Config2025Data);
    }
    if (Array.isArray(cloudState.customEvents)) {
      setCustomEvents(cloudState.customEvents as CustomEvent[]);
    }
    if (Array.isArray(cloudState.personnelInfos)) {
      setPersonnelInfos(cloudState.personnelInfos as PersonnelInfo[]);
    }
    if (cloudState.edgChargesConfig && typeof cloudState.edgChargesConfig === 'object') {
      setEdgChargesConfig(cloudState.edgChargesConfig as EdgChargesConfig);
    }
  }, [rememberLoadedCloudMonths]);

  const applyCloudMonth = useCallback((year: number, month: number, monthData: unknown) => {
    if (!monthData || typeof monthData !== 'object') return;

    cloudApplyingRef.current = true;
    loadedCloudMonthKeysRef.current.add(cloudMonthKey(year, month));
    setAllData(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [month]: monthData as MonthData,
      },
    }));
  }, [cloudMonthKey]);

  useEffect(() => {
    saveToStorage(allData);
  }, [allData]);

  useEffect(() => {
    saveJson(CONFIG_2025_STORAGE_KEY, config2025);
  }, [config2025]);

  useEffect(() => {
    saveJson(CUSTOM_EVENTS_STORAGE_KEY, customEvents);
  }, [customEvents]);

  useEffect(() => {
    saveJson(PERSONNEL_INFOS_STORAGE_KEY, personnelInfos);
  }, [personnelInfos]);

  useEffect(() => {
    saveJson(EDG_CHARGES_CONFIG_STORAGE_KEY, edgChargesConfig);
  }, [edgChargesConfig]);

  useEffect(() => {
    if (!isCloudSyncConfigured) {
      showCloudWarning('Sauvegarde Supabase non configuree : les donnees restent uniquement sur ce PC.');
    }
  }, [showCloudWarning]);

  useEffect(() => {
    if (!isCloudSyncConfigured) return;
    let cancelled = false;
    const bootYear = initialCloudYearRef.current;
    const bootMonth = initialCloudMonthRef.current;

    const loadCloudState = async () => {
      try {
        const remote = await fetchCloudAppBootstrap(bootYear, bootMonth);
        if (cancelled) return;

        if (remote?.value) {
          applyCloudState(remote.value);
          loadedCloudMonthKeysRef.current.add(cloudMonthKey(bootYear, bootMonth));
        } else {
          loadedCloudMonthKeysRef.current.add(cloudMonthKey(bootYear, bootMonth));
          cloudBootstrapDoneRef.current = true;
          await saveCloudAppState({ allData, config2025, customEvents, personnelInfos, edgChargesConfig });
        }
        hideCloudWarning();
        if (!cloudBootstrapDoneRef.current) {
          setTimeout(() => { cloudBootstrapDoneRef.current = true; }, 0);
        }
      } catch (error) {
        console.warn('Sauvegarde Supabase indisponible au chargement :', error);
        showCloudWarning(cloudErrorMessage('Sauvegarde Supabase indisponible au chargement', error));
      } finally {
        if (!cancelled) cloudLoadedRef.current = true;
      }
    };

    loadCloudState();

    return () => {
      cancelled = true;
    };
  }, [applyCloudState, cloudErrorMessage, cloudMonthKey, hideCloudWarning, showCloudWarning]);

  useEffect(() => {
    if (!isCloudSyncConfigured || !cloudLoadedRef.current) return;

    const key = cloudMonthKey(selectedYear, selectedMonth);
    if (loadedCloudMonthKeysRef.current.has(key)) return;

    let cancelled = false;

    const loadSelectedMonth = async () => {
      try {
        const row = await fetchCloudMonth(selectedYear, selectedMonth);
        if (cancelled) return;

        loadedCloudMonthKeysRef.current.add(key);
        if (row?.value) {
          applyCloudMonth(selectedYear, selectedMonth, row.value);
        }
        hideCloudWarning();
      } catch (error) {
        console.warn('Chargement du mois Supabase indisponible :', error);
        showCloudWarning(cloudErrorMessage('Chargement du mois Supabase indisponible', error));
      }
    };

    loadSelectedMonth();

    return () => {
      cancelled = true;
    };
  }, [applyCloudMonth, cloudErrorMessage, cloudMonthKey, hideCloudWarning, selectedMonth, selectedYear, showCloudWarning]);

  // Ne pousse vers Supabase que les snapshots (mois/segments) réellement modifiés
  // dans cette session, puis les retire de la liste des éléments à sauvegarder.
  const performCloudSave = useCallback(async () => {
    const dirtyMonths = new Set(dirtyMonthKeysRef.current);
    const dirtySegments = { ...dirtySegmentsRef.current };
    const hasDirtySegment = dirtySegments.config2025 || dirtySegments.customEvents || dirtySegments.personnelInfos || dirtySegments.edgChargesConfig;
    if (dirtyMonths.size === 0 && !hasDirtySegment) return;

    await saveCloudAppState(latestSnapshotRef.current, { dirtyMonths, dirtySegments });

    dirtyMonths.forEach(key => dirtyMonthKeysRef.current.delete(key));
    (['config2025', 'customEvents', 'personnelInfos', 'edgChargesConfig'] as const).forEach(segment => {
      if (dirtySegments[segment]) dirtySegmentsRef.current[segment] = false;
    });
  }, []);

  useEffect(() => {
    latestSnapshotRef.current = { allData, config2025, customEvents, personnelInfos, edgChargesConfig };

    if (!isCloudSyncConfigured || !cloudLoadedRef.current || !cloudBootstrapDoneRef.current) return;
    if (cloudApplyingRef.current) {
      cloudApplyingRef.current = false;
      return;
    }

    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await performCloudSave();
        hideCloudWarning();
      } catch (error) {
        console.warn('Sauvegarde Supabase indisponible :', error);
        showCloudWarning(cloudErrorMessage('Sauvegarde Supabase echouee', error));
      }
    }, 900);

    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, [allData, config2025, customEvents, personnelInfos, edgChargesConfig, cloudErrorMessage, hideCloudWarning, performCloudSave, showCloudWarning]);

  // Fermeture ou bascule d'onglet : flush immédiat de la sauvegarde débouncée
  // pour ne pas perdre la dernière saisie (le débounce est de 900 ms).
  useEffect(() => {
    if (!isCloudSyncConfigured) return;

    const flushPendingSave = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;
      if (!cloudLoadedRef.current || !cloudBootstrapDoneRef.current) return;
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = null;
      }
      performCloudSave().catch(error => {
        console.warn('Sauvegarde Supabase a la fermeture impossible :', error);
      });
    };

    document.addEventListener('visibilitychange', flushPendingSave);
    window.addEventListener('pagehide', flushPendingSave);
    return () => {
      document.removeEventListener('visibilitychange', flushPendingSave);
      window.removeEventListener('pagehide', flushPendingSave);
    };
  }, [performCloudSave]);

  const addCustomEvent = useCallback((event: CustomEvent) => {
    dirtySegmentsRef.current.customEvents = true;
    setCustomEvents(prev => [...prev, event]);
  }, []);

  const removeCustomEvent = useCallback((id: string) => {
    dirtySegmentsRef.current.customEvents = true;
    setCustomEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updatePersonnelInfos = useCallback((rows: PersonnelInfo[]) => {
    dirtySegmentsRef.current.personnelInfos = true;
    setPersonnelInfos(rows);
  }, []);

  const makeDailyChannelUpdater = useCallback(<K extends DailyChannelKey>(
    channelKey: K,
    defaultDayData: DailyChannelValue<K>,
  ) => (month: number, day: number, field: keyof DailyChannelValue<K>, value: string) => {
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, channelKey, defaultDayData, field, value));
  }, [updateDataForYear]);

  const updateTheorique = useCallback((month: number, day: number, field: keyof DayDataTheorique, value: string | number) => {
    const stored = field === 'commentaire' ? String(value) : parseMoneyValue(value);
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.theorique[day] || DEFAULT_THEORIQUE_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          theorique: {
            ...monthData.theorique,
            [day]: { ...dayData, [field]: stored },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateNepting = useCallback((month: number, day: number, field: keyof DayDataNepting, value: string | number) => {
    const NUMERIC: (keyof DayDataNepting)[] = ['saisie_reel_nepting', 'pourboire_sunday'];
    const stored = NUMERIC.includes(field) ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'nepting', DEFAULT_NEPTING_DAY, field, stored));
  }, [updateDataForYear]);
  const updateEspeces = useCallback((month: number, day: number, field: keyof DayDataEspeces, value: string | number) => {
    const NUMERIC: (keyof DayDataEspeces)[] = ['mis_au_coffre', 'pieces'];
    const stored = NUMERIC.includes(field) ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'especes', DEFAULT_ESPECES_DAY, field, stored));
  }, [updateDataForYear]);
  const updateConecs = useCallback((month: number, day: number, field: keyof DayDataConecs, value: string | number) => {
    const stored = field === 'conecs_reel_nepting' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'conecs', DEFAULT_CONECS_DAY, field, stored));
  }, [updateDataForYear]);
  const updateSunday = useCallback((month: number, day: number, field: keyof DayDataSunday, value: string | number) => {
    const stored = field === 'reel' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'sunday', DEFAULT_REEL_DAY, field, stored));
  }, [updateDataForYear]);
  const updateUber = useCallback((month: number, day: number, field: keyof DayDataUber, value: string | number) => {
    const stored = field === 'reel' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'uber', DEFAULT_REEL_DAY, field, stored));
  }, [updateDataForYear]);
  const updateAmexAncv = useCallback((month: number, day: number, field: keyof DayDataAmexAncv, value: string | number) => {
    const stored = field === 'reel_nepting' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'amexAncv', DEFAULT_AMEX_ANCV_DAY, field, stored));
  }, [updateDataForYear]);
  const updateDeliveroo = useCallback((month: number, day: number, field: keyof DayDataDeliveroo, value: string | number) => {
    const stored = field === 'reel' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'deliveroo', DEFAULT_REEL_DAY, field, stored));
  }, [updateDataForYear]);
  const updateClickCollect = useCallback((month: number, day: number, field: keyof DayDataClickCollect, value: string | number) => {
    const stored = field === 'reel' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => updateDailyChannelData(prev, month, day, 'clickCollect', DEFAULT_REEL_DAY, field, stored));
  }, [updateDataForYear]);

  const updateAncvPapiers = useCallback((month: number, day: number, field: keyof DayDataAncvPapiers, value: string | number) => {
    const NUMERIC: (keyof DayDataAncvPapiers)[] = ['montant_total', 'total_enveloppes_ancv'];
    const stored = NUMERIC.includes(field) ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.ancvPapiers[day] || DEFAULT_ANCV_PAPIERS_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          ancvPapiers: {
            ...monthData.ancvPapiers,
            [day]: { ...dayData, [field]: stored },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateAncvLigne = useCallback((month: number, day: number, index: number, field: keyof AncvEntry, value: string) => {
    const NUM_ROWS = 8;
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const existing = monthData.ancvPapiers[day] || DEFAULT_ANCV_PAPIERS_DAY;
      const lignes: AncvEntry[] = existing.lignes
        ? [...existing.lignes]
        : Array.from({ length: NUM_ROWS }, () => ({ valeur: 0, nombre: '' }));
      while (lignes.length < NUM_ROWS) lignes.push({ valeur: 0, nombre: '' });
      lignes[index] = {
        ...lignes[index],
        [field]: field === 'valeur' ? parseMoneyValue(value) : value,
      };
      let totalMontant = 0;
      let totalNombre = 0;
      lignes.forEach(l => {
        const nb = parseMoneyValue(l.nombre);
        totalMontant += l.valeur * nb;
        totalNombre += nb;
      });
      const updated: DayDataAncvPapiers = {
        ...existing,
        lignes,
        montant_total: totalMontant,
        nombre_ancv: totalNombre > 0 ? String(totalNombre) : '',
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          ancvPapiers: { ...monthData.ancvPapiers, [day]: updated },
        },
      };
    });
  }, [updateDataForYear]);

  const updateSaisieTR = useCallback((month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string | number) => {
    const stored = field === 'valeur' ? parseMoneyValue(value) : String(value);
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const defaultEntries = Array(8).fill({ valeur: 0, nombre: '' });
      const dayData = monthData.saisieTR[day] || {
        edenred: [...defaultEntries],
        pluxee: [...defaultEntries],
        bimpli: [...defaultEntries],
        up: [...defaultEntries],
      };
      const providerData = [...dayData[provider]];
      providerData[index] = { ...providerData[index], [field]: stored };

      return {
        ...prev,
        [month]: {
          ...monthData,
          saisieTR: {
            ...monthData.saisieTR,
            [day]: {
              ...dayData,
              [provider]: providerData,
            },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateVisuTRPapiers = useCallback((month: number, day: number, field: keyof DayDataVisuTRPapiers, value: string) => {
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.visuTRPapiers[day] || DEFAULT_VISU_TR_PAPIERS_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          visuTRPapiers: {
            ...monthData.visuTRPapiers,
            [day]: { ...dayData, [field]: value },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateSalariesConfig = useCallback((month: number, configData: MonthDataSalariesConfig) => {
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      return {
        ...prev,
        [month]: {
          ...monthData,
          salariesConfig: configData,
        },
      };
    });
  }, [updateDataForYear]);

  const updatePersonnelSchema = useCallback((month: number, schema: PersonnelSchema) => {
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      return {
        ...prev,
        [month]: {
          ...monthData,
          personnelSchema: schema,
        },
      };
    });
  }, [updateDataForYear]);

  const markMonthsAsLoaded = useCallback((targetYear: number, months: number[]) => {
    months.forEach(m => loadedCloudMonthKeysRef.current.add(cloudMonthKey(targetYear, m)));
  }, [cloudMonthKey]);

  const loadYearFromCloud = useCallback(async (year: number) => {
    if (!isCloudSyncConfigured || !cloudLoadedRef.current) return;
    // Ne charger que si au moins un mois de l'année n'a pas encore été récupéré
    const anyMissing = Array.from({ length: 12 }, (_, m) => m)
      .some(m => !loadedCloudMonthKeysRef.current.has(cloudMonthKey(year, m)));
    if (!anyMissing) return;
    try {
      const months = await fetchCloudYearMonths(year);
      months.forEach(({ month, value }) => applyCloudMonth(year, month, value));
      // Marquer les 12 mois comme tentés pour éviter les doubles appels
      Array.from({ length: 12 }, (_, m) => m).forEach(m => {
        loadedCloudMonthKeysRef.current.add(cloudMonthKey(year, m));
      });
      hideCloudWarning();
    } catch (error) {
      console.warn('Chargement année N-1 Supabase indisponible :', error);
    }
  }, [applyCloudMonth, cloudMonthKey, hideCloudWarning]);

  const saveNow = useCallback(async () => {
    if (!isCloudSyncConfigured || !cloudLoadedRef.current || !cloudBootstrapDoneRef.current) return;
    // Laisser React appliquer les mises à jour d'état encore en attente (setState est asynchrone)
    // avant de capturer le snapshot, sinon on sauvegarderait l'état d'avant l'action en cours.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    try {
      await performCloudSave();
      hideCloudWarning();
    } catch (error) {
      showCloudWarning(cloudErrorMessage('Sauvegarde Supabase echouee', error));
    }
  }, [cloudErrorMessage, hideCloudWarning, performCloudSave, showCloudWarning]);

  const updateBilanSynthese = useCallback((month: number, day: number, field: keyof DayDataBilanSynthese, value: string | number) => {
    const stored = parseMoneyValue(value);
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.bilanSynthese[day] || DEFAULT_BILAN_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          bilanSynthese: {
            ...monthData.bilanSynthese,
            [day]: { ...dayData, [field]: stored },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateDepensesPetiteCaisse = useCallback((month: number, field: string, value: string | number) => {
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const DEPENSES_NUMERIC_FIELDS = new Set(['solde_debut_mois', 'ht', 'tva', 'montant', 'p100', 'p50', 'p20', 'p10', 'p5', 'p2', 'p1', 'p050', 'p020', 'p010', 'p005', 'p002', 'p001']);
      const defaultDepenses: MonthDataDepensesPetiteCaisse = {
        solde_debut_mois: 0,
        achats: Array(30).fill({ date: '', fournisseur: '', description: '', ht: 0, tva: 0 }),
        alimentations: Array(5).fill({ date: '', montant: 0 }),
        comptabilisation: { c606310: '', c606300: '', c606400: '', c626100: '', c627100: '', c44566: '', c758: '' },
        comptage: { p100: 0, p50: 0, p20: 0, p10: 0, p5: 0, p2: 0, p1: 0, p050: 0, p020: 0, p010: 0, p005: 0, p002: 0, p001: 0 },
      };
      const currentDepenses = monthData.depensesPetiteCaisse || defaultDepenses;
      let newDepenses = { ...currentDepenses };

      const stored = (propKey: string) => DEPENSES_NUMERIC_FIELDS.has(propKey) ? parseMoneyValue(value) : String(value);

      if (field.startsWith('achats[') || field.startsWith('alimentations[')) {
        const match = field.match(/([a-z]+)\[(\d+)\]\.(.+)/);
        if (match) {
          const [, arrayName, indexStr, prop] = match;
          const index = parseInt(indexStr, 10);
          if (arrayName === 'achats') {
            const newArray = [...currentDepenses.achats];
            newArray[index] = { ...newArray[index], [prop]: stored(prop) };
            newDepenses.achats = newArray;
          } else if (arrayName === 'alimentations') {
            const newArray = [...currentDepenses.alimentations];
            newArray[index] = { ...newArray[index], [prop]: stored(prop) };
            newDepenses.alimentations = newArray;
          }
        }
      } else if (field.includes('.')) {
        const [objName, key] = field.split('.');
        if (objName === 'comptabilisation' || objName === 'comptage') {
          newDepenses[objName as 'comptabilisation' | 'comptage'] = {
            ...(currentDepenses[objName as 'comptabilisation' | 'comptage'] as Record<string, string | number>),
            [key]: stored(key),
          } as MonthDataDepensesPetiteCaisse['comptabilisation'] & MonthDataDepensesPetiteCaisse['comptage'];
        }
      } else {
        newDepenses = { ...currentDepenses, [field]: stored(field) };
      }

      return {
        ...prev,
        [month]: {
          ...monthData,
          depensesPetiteCaisse: newDepenses,
        },
      };
    });
  }, [updateDataForYear]);

  const updateDashboard = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(month, prev => updateMonthlyStringRecordData(prev, month, 'dashboard', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuel = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(month, prev => updateMonthlyStringRecordData(prev, month, 'edgMensuel', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuelRealise = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(month, prev => updateMonthlyStringRecordData(prev, month, 'edgMensuelRealise', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuelN1 = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(month, prev => updateMonthlyStringRecordData(prev, month, 'edgMensuelN1', cellKey, value));
  }, [updateDataForYear]);

  // Import en lot du budget EDG (une valeur par mois et par clé) : une seule mise à jour
  // d'état au lieu d'une boucle sur updateEdgMensuel (jusqu'à 12 mois x ~50 clés).
  const importEdgBudget = useCallback((valuesByMonth: Record<number, Record<string, string>>) => {
    const months = Object.keys(valuesByMonth);
    if (months.length === 0) return;
    months.forEach(month => dirtyMonthKeysRef.current.add(selectedYear + ':' + month));
    setAllData(prev => ({
      ...prev,
      [selectedYear]: mergeEdgMensuelBudgetData(prev[selectedYear] || {}, valuesByMonth),
    }));
  }, [selectedYear]);

  const updateMiseEnPaiement = useCallback((month: number, period: 'period1' | 'period2', index: number, field: keyof VirementEntry, value: string | number | boolean) => {
    const stored = (field === 'montantHT' || field === 'montantTTC') ? parseMoneyValue(value as string | number)
      : field === 'paiementEffectue' ? Boolean(value)
      : String(value);
    updateDataForYear(month, prev => {
      const monthData = normalizeMonthData(prev[month]);
      const defaultEntries = Array(10).fill({ fournisseur: '', numFacture: '', montantHT: 0, montantTTC: 0, dateEcheance: '', datePaiementPrevue: '', paiementEffectue: false });
      const currentMiseEnPaiement = monthData.miseEnPaiement || {
        period1: [...defaultEntries],
        period2: [...defaultEntries],
      };
      const periodData = [...currentMiseEnPaiement[period]];
      periodData[index] = { ...periodData[index], [field]: stored };

      return {
        ...prev,
        [month]: {
          ...monthData,
          miseEnPaiement: {
            ...currentMiseEnPaiement,
            [period]: periodData,
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateConfig2025 = useCallback((type: 'mensuel' | 'hebdo', index: number, field: string, value: string) => {
    dirtySegmentsRef.current.config2025 = true;
    setConfig2025(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [index]: {
          ...(prev[type][index] || {}),
          [field]: value,
        },
      },
    }));
  }, []);

  const updateEdgChargesConfig = useCallback((key: string, config: EdgChargeConfig) => {
    dirtySegmentsRef.current.edgChargesConfig = true;
    setEdgChargesConfig(prev => ({ ...prev, [key]: config }));
  }, []);

  const resetLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_V2);
      localStorage.removeItem('gestion_data_v1');
      localStorage.removeItem(CONFIG_2025_STORAGE_KEY);
      localStorage.removeItem(CUSTOM_EVENTS_STORAGE_KEY);
      localStorage.removeItem(PERSONNEL_INFOS_STORAGE_KEY);
      localStorage.removeItem(EDG_CHARGES_CONFIG_STORAGE_KEY);
    } catch {
      // La remise a zero reste possible en memoire meme si le stockage navigateur est indisponible.
    }
    // RAZ strictement locale : on vide les marqueurs "modifié" pour que la
    // sauvegarde automatique n'écrase pas les données Supabase avec du vide.
    // Recharger la page restaure les données depuis le cloud.
    dirtyMonthKeysRef.current.clear();
    dirtySegmentsRef.current = { config2025: false, customEvents: false, personnelInfos: false, edgChargesConfig: false };
    setAllData({});
    setConfig2025({ mensuel: {}, hebdo: {} });
    setCustomEvents([]);
    setPersonnelInfos([]);
    setEdgChargesConfig(createDefaultEdgChargesConfig());
  }, []);

  const value = useMemo<DataContextType>(() => ({
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    data,
    allData,
    updateTheorique,
    updateNepting,
    updateEspeces,
    updateConecs,
    updateAncvPapiers,
    updateAncvLigne,
    updateSaisieTR,
    updateVisuTRPapiers,
    updateSunday,
    updateUber,
    updateAmexAncv,
    updateDeliveroo,
    updateClickCollect,
    updateBilanSynthese,
    updateDepensesPetiteCaisse,
    updateDashboard,
    updateEdgMensuel,
    updateEdgMensuelRealise,
    updateEdgMensuelN1,
    importEdgBudget,
    updateMiseEnPaiement,
    updateSalariesConfig,
    updatePersonnelSchema,
    markMonthsAsLoaded,
    loadYearFromCloud,
    saveNow,
    config2025,
    updateConfig2025,
    edgChargesConfig,
    updateEdgChargesConfig,
    customEvents,
    addCustomEvent,
    removeCustomEvent,
    personnelInfos,
    updatePersonnelInfos,
    resetLocalData,
  }), [
    selectedYear,
    selectedMonth,
    data,
    allData,
    updateTheorique,
    updateNepting,
    updateEspeces,
    updateConecs,
    updateAncvPapiers,
    updateAncvLigne,
    updateSaisieTR,
    updateVisuTRPapiers,
    updateSunday,
    updateUber,
    updateAmexAncv,
    updateDeliveroo,
    updateClickCollect,
    updateBilanSynthese,
    updateDepensesPetiteCaisse,
    updateDashboard,
    updateEdgMensuel,
    updateEdgMensuelRealise,
    updateEdgMensuelN1,
    importEdgBudget,
    updateMiseEnPaiement,
    updateSalariesConfig,
    updatePersonnelSchema,
    markMonthsAsLoaded,
    loadYearFromCloud,
    saveNow,
    config2025,
    updateConfig2025,
    edgChargesConfig,
    updateEdgChargesConfig,
    customEvents,
    addCustomEvent,
    removeCustomEvent,
    personnelInfos,
    updatePersonnelInfos,
    resetLocalData,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
