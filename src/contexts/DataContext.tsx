import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

import { fetchCloudAppBootstrap, fetchCloudMonth, isCloudSyncConfigured, saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';

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
  data: Record<number, MonthData>; // key is month index (0-11)
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

const loadFromStorage = (): Record<number, Record<number, MonthData>> => {
  try {
    const savedV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (savedV2) return JSON.parse(savedV2);
    
    // Migrate v1
    const savedV1 = localStorage.getItem('gestion_data_v1');
    if (savedV1) {
      return { 2026: JSON.parse(savedV1) };
    }
    return {};
  } catch {
    return {};
  }
};

const saveToStorage = (data: Record<number, Record<number, MonthData>>) => {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
  } catch {
    // localStorage plein ou désactivé
  }
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [allData, setAllData] = useState<Record<number, Record<number, MonthData>>>(loadFromStorage);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const data = allData[selectedYear] || {};

  const updateDataForYear = useCallback((updater: (prevYearData: Record<number, MonthData>) => Record<number, MonthData>) => {
    setAllData(prev => {
      const newYearData = updater(prev[selectedYear] || {});
      return { ...prev, [selectedYear]: newYearData };
    });
  }, [selectedYear]);
  const [config2025, setConfig2025] = useState<Config2025Data>(() => {
    try {
      const saved = localStorage.getItem('config2025_data_v1');
      return saved ? JSON.parse(saved) : { mensuel: {}, hebdo: {} };
    } catch {
      return { mensuel: {}, hebdo: {} };
    }
  });

  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => {
    try {
      const saved = localStorage.getItem('custom_events_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [personnelInfos, setPersonnelInfos] = useState<PersonnelInfo[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONNEL_INFOS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cloudLoadedRef = useRef(!isCloudSyncConfigured);
  const cloudApplyingRef = useRef(false);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const loadedCloudMonthKeysRef = useRef<Set<string>>(new Set());
  const initialCloudYearRef = useRef(selectedYear);
  const initialCloudMonthRef = useRef(selectedMonth);

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
        [month]: monthData as MonthData
      }
    }));
  }, [cloudMonthKey]);

  useEffect(() => {
    saveToStorage(allData);
  }, [allData]);

  useEffect(() => {
    try {
      localStorage.setItem('config2025_data_v1', JSON.stringify(config2025));
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, [config2025]);

  useEffect(() => {
    try {
      localStorage.setItem('custom_events_v1', JSON.stringify(customEvents));
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, [customEvents]);

  useEffect(() => {
    try {
      localStorage.setItem(PERSONNEL_INFOS_STORAGE_KEY, JSON.stringify(personnelInfos));
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
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

  const updateTheorique = useCallback((month: number, day: number, field: keyof DayDataTheorique, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {} };
      const dayData = monthData.theorique[day] || {
        total_ca: '', cb: '', amex: '', tr_papier: '', tr_carte: '', ancv: '', 
        especes: '', click_collect: '', uber: '', deliveroo: '', sunday: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          theorique: {
            ...monthData.theorique,
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateNepting = useCallback((month: number, day: number, field: keyof DayDataNepting, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {} };
      const dayData = monthData.nepting[day] || {
        saisie_reel_nepting: '', pourboire_sunday: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          nepting: {
            ...monthData.nepting,
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateEspeces = useCallback((month: number, day: number, field: keyof DayDataEspeces, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {} };
      const dayData = monthData.especes?.[day] || {
        mis_au_coffre: '', pieces: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          especes: {
            ...(monthData.especes || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateConecs = useCallback((month: number, day: number, field: keyof DayDataConecs, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {} };
      const dayData = monthData.conecs?.[day] || {
        conecs_reel_nepting: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          conecs: {
            ...(monthData.conecs || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateAncvPapiers = useCallback((month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {} };
      const dayData = monthData.ancvPapiers?.[day] || {
        nombre_ancv: '', montant_total: '', n_bordereaux: '', nbre_ancv_enveloppes: '', total_enveloppes_ancv: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          ancvPapiers: {
            ...(monthData.ancvPapiers || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateSaisieTR = useCallback((month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {} };
      const saisieTRData = monthData.saisieTR || {};
      
      const defaultEntries = Array(8).fill({ valeur: '', nombre: '' });
      const dayData = saisieTRData[day] || {
        edenred: [...defaultEntries],
        pluxee: [...defaultEntries],
        bimpli: [...defaultEntries],
        up: [...defaultEntries]
      };
      
      const providerData = [...dayData[provider]];
      providerData[index] = { ...providerData[index], [field]: value };
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          saisieTR: {
            ...saisieTRData,
            [day]: {
              ...dayData,
              [provider]: providerData
            }
          }
        }
      };
    });
  }, []);

  const updateVisuTRPapiers = useCallback((month: number, day: number, field: keyof DayDataVisuTRPapiers, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {} };
      const dayData = monthData.visuTRPapiers?.[day] || {
        n_bordereaux: '', nbre_tr_enveloppes: '', total_enveloppes_tr: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          visuTRPapiers: {
            ...(monthData.visuTRPapiers || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateSunday = useCallback((month: number, day: number, field: keyof DayDataSunday, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {} };
      const dayData = monthData.sunday?.[day] || {
        reel: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          sunday: {
            ...(monthData.sunday || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateUber = useCallback((month: number, day: number, field: keyof DayDataUber, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {} };
      const dayData = monthData.uber?.[day] || {
        reel: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          uber: {
            ...(monthData.uber || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateAmexAncv = useCallback((month: number, day: number, field: keyof DayDataAmexAncv, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {} };
      const dayData = monthData.amexAncv?.[day] || {
        reel_nepting: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          amexAncv: {
            ...(monthData.amexAncv || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateDeliveroo = useCallback((month: number, day: number, field: keyof DayDataDeliveroo, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {} };
      const dayData = monthData.deliveroo?.[day] || {
        reel: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          deliveroo: {
            ...(monthData.deliveroo || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateClickCollect = useCallback((month: number, day: number, field: keyof DayDataClickCollect, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {} };
      const dayData = monthData.clickCollect?.[day] || {
        reel: '', commentaire: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          clickCollect: {
            ...(monthData.clickCollect || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateSalariesConfig = useCallback((month: number, configData: MonthDataSalariesConfig) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {} };
      return {
        ...prev,
        [month]: {
          ...monthData,
          salariesConfig: configData
        }
      };
    });
  }, []);

  const updateBilanSynthese = useCallback((month: number, day: number, field: keyof DayDataBilanSynthese, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {} };
      const dayData = monthData.bilanSynthese?.[day] || {
        ttc_5_5: '', ttc_10: '', ttc_20: ''
      };
      return {
        ...prev,
        [month]: {
          ...monthData,
          bilanSynthese: {
            ...(monthData.bilanSynthese || {}),
            [day]: { ...dayData, [field]: value }
          }
        }
      };
    });
  }, []);

  const updateDepensesPetiteCaisse = useCallback((month: number, field: string, value: string | number) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {} };
      
      const defaultDepenses: MonthDataDepensesPetiteCaisse = {
        solde_debut_mois: '',
        achats: Array(30).fill({ date: '', fournisseur: '', description: '', ht: '', tva: '' }),
        alimentations: Array(5).fill({ date: '', montant: '' }),
        comptabilisation: { c606310: '', c606300: '', c606400: '', c626100: '', c627100: '', c44566: '', c758: '' },
        comptage: { p100: '', p50: '', p20: '', p10: '', p5: '', p2: '', p1: '', p050: '', p020: '', p010: '', p005: '', p002: '', p001: '' }
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
            [key]: value 
          } as MonthDataDepensesPetiteCaisse['comptabilisation'] & MonthDataDepensesPetiteCaisse['comptage'];
        }
      } else {
        newDepenses = { ...currentDepenses, [field]: value };
      }

      return {
        ...prev,
        [month]: {
          ...monthData,
          depensesPetiteCaisse: newDepenses
        }
      };
    });
  }, []);

  const updateDashboard = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {}, dashboard: {} };
      const dashboardData = monthData.dashboard || {};
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          dashboard: {
            ...dashboardData,
            [cellKey]: value
          }
        }
      };
    });
  }, []);

  const updateEdgMensuel = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {}, dashboard: {}, edgMensuel: {} };
      const edgData = monthData.edgMensuel || {};
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          edgMensuel: {
            ...edgData,
            [cellKey]: value
          }
        }
      };
    });
  }, []);

  const updateEdgMensuelRealise = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {}, dashboard: {}, edgMensuel: {}, edgMensuelRealise: {}, edgMensuelN1: {} };
      const edgData = monthData.edgMensuelRealise || {};
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          edgMensuelRealise: {
            ...edgData,
            [cellKey]: value
          }
        }
      };
    });
  }, []);

  const updateEdgMensuelN1 = useCallback((month: number, cellKey: string, value: string) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {}, dashboard: {}, edgMensuel: {}, edgMensuelRealise: {}, edgMensuelN1: {} };
      const edgData = monthData.edgMensuelN1 || {};
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          edgMensuelN1: {
            ...edgData,
            [cellKey]: value
          }
        }
      };
    });
  }, []);

  const updateMiseEnPaiement = useCallback((month: number, period: 'period1' | 'period2', index: number, field: keyof VirementEntry, value: string | boolean) => {
    updateDataForYear(prev => {
      const monthData = prev[month] || { theorique: {}, nepting: {}, especes: {}, conecs: {}, ancvPapiers: {}, saisieTR: {}, visuTRPapiers: {}, sunday: {}, uber: {}, amexAncv: {}, deliveroo: {}, clickCollect: {}, bilanSynthese: {}, dashboard: {}, edgMensuel: {}, edgMensuelRealise: {}, edgMensuelN1: {} };
      
      const defaultEntries = Array(10).fill({ fournisseur: '', numFacture: '', montantHT: '', montantTTC: '', dateEcheance: '', datePaiementPrevue: '', paiementEffectue: false });
      const currentMiseEnPaiement = monthData.miseEnPaiement || {
        period1: [...defaultEntries],
        period2: [...defaultEntries]
      };
      
      const periodData = [...currentMiseEnPaiement[period]];
      periodData[index] = { ...periodData[index], [field]: value };
      
      return {
        ...prev,
        [month]: {
          ...monthData,
          miseEnPaiement: {
            ...currentMiseEnPaiement,
            [period]: periodData
          }
        }
      };
    });
  }, []);

  const updateConfig2025 = useCallback((type: 'mensuel' | 'hebdo', index: number, field: string, value: string) => {
    setConfig2025(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [index]: {
          ...(prev[type][index] || {}),
          [field]: value
        }
      }
    }));
  }, []);

  const resetLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_V2);
      localStorage.removeItem('gestion_data_v1');
      localStorage.removeItem('config2025_data_v1');
      localStorage.removeItem('custom_events_v1');
      localStorage.removeItem(PERSONNEL_INFOS_STORAGE_KEY);
    } catch {
      // La remise à zéro reste possible en mémoire même si le stockage navigateur est indisponible.
    }
    setAllData({});
    setConfig2025({ mensuel: {}, hebdo: {} });
    setCustomEvents([]);
    setPersonnelInfos([]);
  }, []);

  return (
    <DataContext.Provider value={{ selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, data, allData, updateTheorique, updateNepting, updateEspeces, updateConecs, updateAncvPapiers, updateSaisieTR, updateVisuTRPapiers, updateSunday, updateUber, updateAmexAncv, updateDeliveroo, updateClickCollect, updateBilanSynthese, updateDepensesPetiteCaisse, updateDashboard, updateEdgMensuel, updateEdgMensuelRealise, updateEdgMensuelN1, updateMiseEnPaiement, updateSalariesConfig, config2025, updateConfig2025, customEvents, addCustomEvent, removeCustomEvent, personnelInfos, updatePersonnelInfos, resetLocalData }}>
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
