import { useCallback, useEffect, useRef, useState } from 'react';

import type { SiteId } from '@/lib/sites';
import { loadShiftDoc, saveShiftDoc, weekDocKey } from '@/services/supabaseShiftPlanning';
import type { Shift, ShiftAbsence, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';

import { DEFAULT_SHIFT_SETTINGS } from '../shiftCalculations';
import { normalizeSettings, readArray } from '../shiftSources';

const SAVE_DEBOUNCE_MS = 800;

export type ShiftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Documents Supabase du planning (réglages, personnel, absences, semaine) : chargement et sauvegarde
// avec debounce, directement dans suivi_gestion_shift_planning (jamais via DataContext).
export function useShiftPlanningDocs(siteId: SiteId, mondayIso: string) {
  const [settings, setSettingsState] = useState<ShiftPlanningSettings>(DEFAULT_SHIFT_SETTINGS);
  const [storedStaff, setStoredStaffState] = useState<ShiftStaffMember[]>([]);
  const [absences, setAbsencesState] = useState<ShiftAbsence[]>([]);
  const [weekState, setWeekState] = useState<{ monday: string; shifts: Shift[] } | null>(null);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<ShiftSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef(new Map<string, object>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const weekRef = useRef<{ monday: string; shifts: Shift[] } | null>(null);

  const flushKey = useCallback(async (docKey: string) => {
    const timer = timersRef.current.get(docKey);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(docKey);
    const data = pendingRef.current.get(docKey);
    if (!data) return;
    pendingRef.current.delete(docKey);
    setSaveStatus('saving');
    try {
      await saveShiftDoc(siteId, docKey, data);
      setSaveStatus('saved');
      setError(null);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible.');
    }
  }, [siteId]);

  const scheduleSave = useCallback((docKey: string, data: object) => {
    pendingRef.current.set(docKey, data);
    const existing = timersRef.current.get(docKey);
    if (existing) clearTimeout(existing);
    timersRef.current.set(docKey, setTimeout(() => { void flushKey(docKey); }, SAVE_DEBOUNCE_MS));
  }, [flushKey]);

  // Envoie les sauvegardes en attente au démontage (changement de page) et au changement de semaine.
  const flushAll = useCallback(() => {
    [...pendingRef.current.keys()].forEach(docKey => { void flushKey(docKey); });
  }, [flushKey]);

  useEffect(() => () => flushAll(), [flushAll]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadShiftDoc<unknown>(siteId, 'settings'),
      loadShiftDoc<unknown>(siteId, 'staff'),
      loadShiftDoc<unknown>(siteId, 'absences'),
    ]).then(([rawSettings, rawStaff, rawAbsences]) => {
      if (cancelled) return;
      setSettingsState(normalizeSettings(rawSettings, DEFAULT_SHIFT_SETTINGS));
      setStoredStaffState(readArray<ShiftStaffMember>(rawStaff, 'members'));
      setAbsencesState(readArray<ShiftAbsence>(rawAbsences, 'absences'));
      setBaseLoaded(true);
    }).catch(err => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Lecture impossible.');
      setBaseLoaded(true);
    });
    return () => { cancelled = true; };
  }, [siteId]);

  useEffect(() => {
    let cancelled = false;
    flushAll();
    void loadShiftDoc<unknown>(siteId, weekDocKey(mondayIso)).then(raw => {
      if (cancelled) return;
      const next = { monday: mondayIso, shifts: readArray<Shift>(raw, 'shifts') };
      weekRef.current = next;
      setWeekState(next);
    }).catch(err => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Lecture impossible.');
      const next = { monday: mondayIso, shifts: [] };
      weekRef.current = next;
      setWeekState(next);
    });
    return () => { cancelled = true; };
  }, [siteId, mondayIso, flushAll]);

  const setSettings = useCallback((next: ShiftPlanningSettings) => {
    setSettingsState(next);
    scheduleSave('settings', next);
  }, [scheduleSave]);

  const setStoredStaff = useCallback((members: ShiftStaffMember[]) => {
    setStoredStaffState(members);
    scheduleSave('staff', { members });
  }, [scheduleSave]);

  const setAbsences = useCallback((next: ShiftAbsence[]) => {
    setAbsencesState(next);
    scheduleSave('absences', { absences: next });
  }, [scheduleSave]);

  const updateShifts = useCallback((updater: (shifts: Shift[]) => Shift[]) => {
    const current = weekRef.current;
    if (!current || current.monday !== mondayIso) return;
    const next = { monday: current.monday, shifts: updater(current.shifts) };
    weekRef.current = next;
    setWeekState(next);
    scheduleSave(weekDocKey(next.monday), { shifts: next.shifts });
  }, [mondayIso, scheduleSave]);

  const weekReady = weekState?.monday === mondayIso;

  return {
    settings, setSettings,
    storedStaff, setStoredStaff,
    absences, setAbsences,
    shifts: weekReady && weekState ? weekState.shifts : [],
    updateShifts,
    isLoading: !baseLoaded || !weekReady,
    saveStatus,
    error,
  };
}
