import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';

import { fetchCloudAppBootstrap, fetchCloudMonth, isCloudSyncConfigured, saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';
import { normalizeMonthData, updateDailyChannelData, updateMonthlyStringRecordData, type DailyChannelKey, type DailyChannelValue } from './dataContextUpdateHelpers';

export type DayDataTheorique = {
  total_ca: string;
  cb: string;
  amex: string;
  tr_papier: string;
  tr_carte: string;
  ancv: string;
  especes: string;
  click_collect: string;
  uber: string;
  deliveroo: string;
  sunday: string;
  commentaire: string;
};

type DayDataNepting = {
  saisie_reel_nepting: string;
  pourboire_sunday: string;
  commentaire: string;
};

type DayDataEspeces = {
  mis_au_coffre: string;
  pieces: string;
  commentaire: string;
};

type DayDataConecs = {
  conecs_reel_nepting: string;
  commentaire: string;
};

export type DayDataAncvPapiers = {
  nombre_ancv: string;
  montant_total: string;
  n_bordereaux: string;
  nbre_ancv_enveloppes: string;
  total_enveloppes_ancv: string;
  commentaire: string;
};

export type TrEntry = {
  valeur: string;
  nombre: string;
};

export type DayDataSaisieTR = {
  edenred: TrEntry[];
  pluxee: TrEntry[];
  bimpli: TrEntry[];
  up: TrEntry[];
};

export type DayDataVisuTRPapiers = {
  n_bordereaux: string;
  nbre_tr_enveloppes: string;
  total_enveloppes_tr: string;
  commentaire: string;
};

export type DayDataSunday = {
  reel: string;
  commentaire: string;
};

export type DayDataUber = {
  reel: string;
  commentaire: string;
};

export type DayDataAmexAncv = {
  reel_nepting: string;
  commentaire: string;
};

export type DayDataDeliveroo = {
  reel: string;
  commentaire: string;
};

export type DayDataClickCollect = {
  reel: string;
  commentaire: string;
};

export type DayDataBilanSynthese = {
  ttc_5_5: string;
  ttc_10: string;
  ttc_20: string;
};

export type AchatEntry = {
  date: string;
  fournisseur: string;
  description: string;
  ht: string;
  tva: string;
};

export type AlimentationEntry = {
  date: string;
  montant: string;
};

export type MonthDataDepensesPetiteCaisse = {
  solde_debut_mois: string;
  achats: AchatEntry[];
  alimentations: AlimentationEntry[];
  comptabilisation: {
    c606310: string;
    c606300: string;
    c606400: string;
    c626100: string;
    c627100: string;
    c44566: string;
    c758: string;
  };
  comptage: {
    p100: string;
    p50: string;
    p20: string;
    p10: string;
    p5: string;
    p2: string;
    p1: string;
    p050: string;
    p020: string;
    p010: string;
    p005: string;
    p002: string;
    p001: string;
  };
};

export type VirementEntry = {
  fournisseur: string;
  numFacture: string;
  montantHT: string;
  montantTTC: string;
  dateEcheance: string;
  datePaiementPrevue: string;
  paiementEffectue: boolean;
};

export type MonthDataMiseEnPaiement = {
  period1: VirementEntry[];
  period2: VirementEntry[];
};

export type Config2025Data = {
  mensuel: Record<number, Record<string, string>>;
  hebdo: Record<number, Record<string, string>>;
};

export type CustomEvent = {
  id: string;
  date: string;
  label: string;
};

export type SalarieRow = {
  nom: string;
  heures: string;
  coutGlobal: string;
  provision: string;
  coutHoraire: string;
  department?: PersonnelDepartment;
  importSourceLine?: string;
};

export type MonthDataSalariesConfig = {
  locked: boolean;
  categories: Record<string, SalarieRow[]>;
};

export type PersonnelCategory = 'cadre' | 'maitrise' | 'niv12' | 'niv3' | 'apprenti';
export type PersonnelDepartment = 'cuisine' | 'salle';

export type PersonnelInfo = {
  id: string;
  nom: string;
  category: PersonnelCategory;
  department: PersonnelDepartment;
  aliases: string;
};

export type MonthData = {
  theorique: Record<number, DayDataTheorique>;
  nepting: Record<number, DayDataNepting>;
  especes: Record<number, DayDataEspeces>;
  conecs: Record<number, DayDataConecs>;
  ancvPapiers: Record<number, DayDataAncvPapiers>;
  saisieTR: Record<number, DayDataSaisieTR>;
  visuTRPapiers: Record<number, DayDataVisuTRPapiers>;
  sunday: Record<number, DayDataSunday>;
  uber: Record<number, DayDataUber>;
  amexAncv: Record<number, DayDataAmexAncv>;
  deliveroo: Record<number, DayDataDeliveroo>;
  clickCollect: Record<number, DayDataClickCollect>;
  bilanSynthese: Record<number, DayDataBilanSynthese>;
  depensesPetiteCaisse?: MonthDataDepensesPetiteCaisse;
  dashboard?: Record<string, string>;
  edgMensuel?: Record<string, string>;
  edgMensuelRealise?: Record<string, string>;
  edgMensuelN1?: Record<string, string>;
  miseEnPaiement?: MonthDataMiseEnPaiement;
  salariesConfig?: MonthDataSalariesConfig;
};

type DataContextType = {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  data: Record<number, MonthData>;
  allData: Record<number, Record<number, MonthData>>;
  updateTheorique: (month: number, day: number, field: keyof DayDataTheorique, value: string) => void;
  updateNepting: (month: number, day: number, field: keyof DayDataNepting, value: string) => void;
  updateEspeces: (month: number, day: number, field: keyof DayDataEspeces, value: string) => void;
  updateConecs: (month: number, day: number, field: keyof DayDataConecs, value: string) => void;
  updateAncvPapiers: (month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => void;
  updateSaisieTR: (month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => void;
  updateVisuTRPapiers: (month: number, day: number, field: keyof DayDataVisuTRPapiers, value: string) => void;
  updateSunday: (month: number, day: number, field: keyof DayDataSunday, value: string) => void;
  updateUber: (month: number, day: number, field: keyof DayDataUber, value: string) => void;
  updateAmexAncv: (month: number, day: number, field: keyof DayDataAmexAncv, value: string) => void;
  updateDeliveroo: (month: number, day: number, field: keyof DayDataDeliveroo, value: string) => void;
  updateClickCollect: (month: number, day: number, field: keyof DayDataClickCollect, value: string) => void;
  updateBilanSynthese: (month: number, day: number, field: keyof DayDataBilanSynthese, value: string) => void;
  updateDepensesPetiteCaisse: (month: number, field: keyof MonthDataDepensesPetiteCaisse | string, value: string | number) => void;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuel: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuelRealise: (month: number, cellKey: string, value: string) => void;
  updateEdgMensuelN1: (month: number, cellKey: string, value: string) => void;
  updateMiseEnPaiement: (month: number, period: 'period1' | 'period2', index: number, field: keyof VirementEntry, value: string | boolean) => void;
  updateSalariesConfig: (month: number, data: MonthDataSalariesConfig) => void;
  config2025: Config2025Data;
  updateConfig2025: (type: 'mensuel' | 'hebdo', index: number, field: string, value: string) => void;
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

const DEFAULT_THEORIQUE_DAY: DayDataTheorique = {
  total_ca: '', cb: '', amex: '', tr_papier: '', tr_carte: '', ancv: '',
  especes: '', click_collect: '', uber: '', deliveroo: '', sunday: '', commentaire: '',
};
const DEFAULT_NEPTING_DAY: DayDataNepting = { saisie_reel_nepting: '', pourboire_sunday: '', commentaire: '' };
const DEFAULT_ESPECES_DAY: DayDataEspeces = { mis_au_coffre: '', pieces: '', commentaire: '' };
const DEFAULT_CONECS_DAY: DayDataConecs = { conecs_reel_nepting: '', commentaire: '' };
const DEFAULT_ANCV_PAPIERS_DAY: DayDataAncvPapiers = { nombre_ancv: '', montant_total: '', n_bordereaux: '', nbre_ancv_enveloppes: '', total_enveloppes_ancv: '', commentaire: '' };
const DEFAULT_VISU_TR_PAPIERS_DAY: DayDataVisuTRPapiers = { n_bordereaux: '', nbre_tr_enveloppes: '', total_enveloppes_tr: '', commentaire: '' };
const DEFAULT_REEL_DAY: DayDataSunday = { reel: '', commentaire: '' };
const DEFAULT_AMEX_ANCV_DAY: DayDataAmexAncv = { reel_nepting: '', commentaire: '' };
const DEFAULT_BILAN_DAY: DayDataBilanSynthese = { ttc_5_5: '', ttc_10: '', ttc_20: '' };

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

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [allData, setAllData] = useState<Record<number, Record<number, MonthData>>>(loadFromStorage);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [config2025, setConfig2025] = useState<Config2025Data>(() => loadJson(CONFIG_2025_STORAGE_KEY, { mensuel: {}, hebdo: {} }));
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => loadJson(CUSTOM_EVENTS_STORAGE_KEY, []));
  const [personnelInfos, setPersonnelInfos] = useState<PersonnelInfo[]>(() => loadJson(PERSONNEL_INFOS_STORAGE_KEY, []));

  const data = allData[selectedYear] || {};

  const cloudLoadedRef = useRef(!isCloudSyncConfigured);
  const cloudApplyingRef = useRef(false);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const loadedCloudMonthKeysRef = useRef<Set<string>>(new Set());
  const initialCloudYearRef = useRef(selectedYear);
  const initialCloudMonthRef = useRef(selectedMonth);

  const updateDataForYear = useCallback((updater: (prevYearData: Record<number, MonthData>) => Record<number, MonthData>) => {
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
      setAllData(cloudState.allData as Record<number, Record<number, MonthData>>);
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
          await saveCloudAppState({ allData, config2025, customEvents, personnelInfos });
        }
        hideCloudWarning();
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

  useEffect(() => {
    if (!isCloudSyncConfigured || !cloudLoadedRef.current) return;
    if (cloudApplyingRef.current) {
      cloudApplyingRef.current = false;
      return;
    }

    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
    }

    const snapshot = { allData, config2025, customEvents, personnelInfos };
    cloudSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveCloudAppState(snapshot);
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
  }, [allData, config2025, customEvents, personnelInfos, cloudErrorMessage, hideCloudWarning, showCloudWarning]);

  const addCustomEvent = useCallback((event: CustomEvent) => {
    setCustomEvents(prev => [...prev, event]);
  }, []);

  const removeCustomEvent = useCallback((id: string) => {
    setCustomEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updatePersonnelInfos = useCallback((rows: PersonnelInfo[]) => {
    setPersonnelInfos(rows);
  }, []);

  const makeDailyChannelUpdater = useCallback(<K extends DailyChannelKey>(
    channelKey: K,
    defaultDayData: DailyChannelValue<K>,
  ) => (month: number, day: number, field: keyof DailyChannelValue<K>, value: string) => {
    updateDataForYear(prev => updateDailyChannelData(prev, month, day, channelKey, defaultDayData, field, value));
  }, [updateDataForYear]);

  const updateTheorique = useCallback((month: number, day: number, field: keyof DayDataTheorique, value: string) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.theorique[day] || DEFAULT_THEORIQUE_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          theorique: {
            ...monthData.theorique,
            [day]: { ...dayData, [field]: value },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateNepting = useMemo(() => makeDailyChannelUpdater('nepting', DEFAULT_NEPTING_DAY), [makeDailyChannelUpdater]);
  const updateEspeces = useMemo(() => makeDailyChannelUpdater('especes', DEFAULT_ESPECES_DAY), [makeDailyChannelUpdater]);
  const updateConecs = useMemo(() => makeDailyChannelUpdater('conecs', DEFAULT_CONECS_DAY), [makeDailyChannelUpdater]);
  const updateSunday = useMemo(() => makeDailyChannelUpdater('sunday', DEFAULT_REEL_DAY), [makeDailyChannelUpdater]);
  const updateUber = useMemo(() => makeDailyChannelUpdater('uber', DEFAULT_REEL_DAY), [makeDailyChannelUpdater]);
  const updateAmexAncv = useMemo(() => makeDailyChannelUpdater('amexAncv', DEFAULT_AMEX_ANCV_DAY), [makeDailyChannelUpdater]);
  const updateDeliveroo = useMemo(() => makeDailyChannelUpdater('deliveroo', DEFAULT_REEL_DAY), [makeDailyChannelUpdater]);
  const updateClickCollect = useMemo(() => makeDailyChannelUpdater('clickCollect', DEFAULT_REEL_DAY), [makeDailyChannelUpdater]);

  const updateAncvPapiers = useCallback((month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.ancvPapiers[day] || DEFAULT_ANCV_PAPIERS_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          ancvPapiers: {
            ...monthData.ancvPapiers,
            [day]: { ...dayData, [field]: value },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateSaisieTR = useCallback((month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const defaultEntries = Array(8).fill({ valeur: '', nombre: '' });
      const dayData = monthData.saisieTR[day] || {
        edenred: [...defaultEntries],
        pluxee: [...defaultEntries],
        bimpli: [...defaultEntries],
        up: [...defaultEntries],
      };
      const providerData = [...dayData[provider]];
      providerData[index] = { ...providerData[index], [field]: value };

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
    updateDataForYear(prev => {
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
    updateDataForYear(prev => {
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

  const updateBilanSynthese = useCallback((month: number, day: number, field: keyof DayDataBilanSynthese, value: string) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const dayData = monthData.bilanSynthese[day] || DEFAULT_BILAN_DAY;
      return {
        ...prev,
        [month]: {
          ...monthData,
          bilanSynthese: {
            ...monthData.bilanSynthese,
            [day]: { ...dayData, [field]: value },
          },
        },
      };
    });
  }, [updateDataForYear]);

  const updateDepensesPetiteCaisse = useCallback((month: number, field: string, value: string | number) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const defaultDepenses: MonthDataDepensesPetiteCaisse = {
        solde_debut_mois: '',
        achats: Array(30).fill({ date: '', fournisseur: '', description: '', ht: '', tva: '' }),
        alimentations: Array(5).fill({ date: '', montant: '' }),
        comptabilisation: { c606310: '', c606300: '', c606400: '', c626100: '', c627100: '', c44566: '', c758: '' },
        comptage: { p100: '', p50: '', p20: '', p10: '', p5: '', p2: '', p1: '', p050: '', p020: '', p010: '', p005: '', p002: '', p001: '' },
      };
      const currentDepenses = monthData.depensesPetiteCaisse || defaultDepenses;
      let newDepenses = { ...currentDepenses };

      if (field.startsWith('achats[') || field.startsWith('alimentations[')) {
        const match = field.match(/([a-z]+)\[(\d+)\]\.(.+)/);
        if (match) {
          const [, arrayName, indexStr, prop] = match;
          const index = parseInt(indexStr, 10);
          if (arrayName === 'achats') {
            const newArray = [...currentDepenses.achats];
            newArray[index] = { ...newArray[index], [prop]: value };
            newDepenses.achats = newArray;
          } else if (arrayName === 'alimentations') {
            const newArray = [...currentDepenses.alimentations];
            newArray[index] = { ...newArray[index], [prop]: value };
            newDepenses.alimentations = newArray;
          }
        }
      } else if (field.includes('.')) {
        const [objName, key] = field.split('.');
        if (objName === 'comptabilisation' || objName === 'comptage') {
          newDepenses[objName as 'comptabilisation' | 'comptage'] = {
            ...(currentDepenses[objName as 'comptabilisation' | 'comptage'] as Record<string, string | number>),
            [key]: value,
          } as MonthDataDepensesPetiteCaisse['comptabilisation'] & MonthDataDepensesPetiteCaisse['comptage'];
        }
      } else {
        newDepenses = { ...currentDepenses, [field]: value };
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
    updateDataForYear(prev => updateMonthlyStringRecordData(prev, month, 'dashboard', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuel = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => updateMonthlyStringRecordData(prev, month, 'edgMensuel', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuelRealise = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => updateMonthlyStringRecordData(prev, month, 'edgMensuelRealise', cellKey, value));
  }, [updateDataForYear]);

  const updateEdgMensuelN1 = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => updateMonthlyStringRecordData(prev, month, 'edgMensuelN1', cellKey, value));
  }, [updateDataForYear]);

  const updateMiseEnPaiement = useCallback((month: number, period: 'period1' | 'period2', index: number, field: keyof VirementEntry, value: string | boolean) => {
    updateDataForYear(prev => {
      const monthData = normalizeMonthData(prev[month]);
      const defaultEntries = Array(10).fill({ fournisseur: '', numFacture: '', montantHT: '', montantTTC: '', dateEcheance: '', datePaiementPrevue: '', paiementEffectue: false });
      const currentMiseEnPaiement = monthData.miseEnPaiement || {
        period1: [...defaultEntries],
        period2: [...defaultEntries],
      };
      const periodData = [...currentMiseEnPaiement[period]];
      periodData[index] = { ...periodData[index], [field]: value };

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

  const resetLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_V2);
      localStorage.removeItem('gestion_data_v1');
      localStorage.removeItem(CONFIG_2025_STORAGE_KEY);
      localStorage.removeItem(CUSTOM_EVENTS_STORAGE_KEY);
      localStorage.removeItem(PERSONNEL_INFOS_STORAGE_KEY);
    } catch {
      // La remise a zero reste possible en memoire meme si le stockage navigateur est indisponible.
    }
    setAllData({});
    setConfig2025({ mensuel: {}, hebdo: {} });
    setCustomEvents([]);
    setPersonnelInfos([]);
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
    updateMiseEnPaiement,
    updateSalariesConfig,
    config2025,
    updateConfig2025,
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
    updateMiseEnPaiement,
    updateSalariesConfig,
    config2025,
    updateConfig2025,
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
