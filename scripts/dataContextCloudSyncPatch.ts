import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch sauvegarde Supabase DataContext non applique : ' + label);
  return code.replace(from, to);
};

const reactImportSource = `import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';`;
const reactImportReplacement = `import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

import { fetchCloudAppBootstrap, fetchCloudMonth, isCloudSyncConfigured, saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';`;

const refsInsertionSource = `  const [personnelInfos, setPersonnelInfos] = useState<PersonnelInfo[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONNEL_INFOS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });`;

const refsInsertionReplacement = `  const [personnelInfos, setPersonnelInfos] = useState<PersonnelInfo[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONNEL_INFOS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cloudLoadedRef = useRef(!isCloudSyncConfigured);
  const cloudApplyingRef = useRef(false);
  const cloudSaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
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
  }, [cloudMonthKey]);`;

const personnelStorageEffectSource = `  useEffect(() => {
    try {
      localStorage.setItem(PERSONNEL_INFOS_STORAGE_KEY, JSON.stringify(personnelInfos));
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, [personnelInfos]);`;

const personnelStorageEffectReplacement = `  useEffect(() => {
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
  }, [allData, config2025, customEvents, personnelInfos, cloudErrorMessage, hideCloudWarning, showCloudWarning]);`;

export const dataContextCloudSyncPatch = (): Plugin => ({
  name: 'data-context-cloud-save-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/contexts/DataContext.tsx')) return null;
    let next = code;

    next = replaceRequired(next, reactImportSource, reactImportReplacement, 'imports');
    next = replaceRequired(next, refsInsertionSource, refsInsertionReplacement, 'refs et apply cloud');
    next = replaceRequired(next, personnelStorageEffectSource, personnelStorageEffectReplacement, 'effects cloud');

    return { code: next, map: null };
  },
});
