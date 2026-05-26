import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch sync Supabase DataContext non applique : ' + label);
  return code.replace(from, to);
};

const reactImportSource = `import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';`;
const reactImportReplacement = `import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

import { fetchCloudAppState, isCloudSyncConfigured, saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';`;

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
  const lastCloudUpdatedAtRef = useRef<string | null>(null);

  const applyCloudState = useCallback((cloudState: CloudAppState, updatedAt: string | null) => {
    cloudApplyingRef.current = true;
    lastCloudUpdatedAtRef.current = updatedAt;

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
  }, []);`;

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
    if (!isCloudSyncConfigured) return;
    let cancelled = false;

    const loadCloudState = async () => {
      try {
        const remote = await fetchCloudAppState();
        if (cancelled) return;

        if (remote?.value) {
          applyCloudState(remote.value, remote.updated_at);
        } else {
          const saved = await saveCloudAppState({ allData, config2025, customEvents, personnelInfos });
          if (!cancelled) lastCloudUpdatedAtRef.current = saved?.updated_at || null;
        }
      } catch (error) {
        console.warn('Synchronisation Supabase indisponible au chargement :', error);
      } finally {
        if (!cancelled) cloudLoadedRef.current = true;
      }
    };

    loadCloudState();

    return () => {
      cancelled = true;
    };
  }, [applyCloudState]);

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
        const saved = await saveCloudAppState(snapshot);
        lastCloudUpdatedAtRef.current = saved?.updated_at || lastCloudUpdatedAtRef.current;
      } catch (error) {
        console.warn('Sauvegarde Supabase indisponible :', error);
      }
    }, 900);

    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, [allData, config2025, customEvents, personnelInfos]);

  useEffect(() => {
    if (!isCloudSyncConfigured) return;

    const intervalId = window.setInterval(async () => {
      if (!cloudLoadedRef.current) return;

      try {
        const remote = await fetchCloudAppState();
        if (!remote?.value || !remote.updated_at) return;
        if (remote.updated_at === lastCloudUpdatedAtRef.current) return;

        applyCloudState(remote.value, remote.updated_at);
      } catch (error) {
        console.warn('Actualisation Supabase indisponible :', error);
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [applyCloudState]);`;

export const dataContextCloudSyncPatch = (): Plugin => ({
  name: 'data-context-cloud-sync-patch',
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
