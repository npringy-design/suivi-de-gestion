import { useState } from 'react';

import { MONTH_NAMES_SHORT } from '@/lib/constants';
import type {
  AnalyseFilters,
  AnalyseService,
  AnalyseThresholds,
  AnalyseVacationMode,
} from '@/types/dataTypes';

import { WEEKDAY_ORDER, monthKey } from '../ecartsAnalysis';

import { analyseGlass, analyseLabel } from './analyseStyles';

const WEEKDAY_LABELS: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' };

const SERVICE_OPTIONS: { value: AnalyseService; label: string }[] = [
  { value: 'midi', label: 'Midi' },
  { value: 'soir', label: 'Soir' },
  { value: 'journee', label: 'Journée' },
];

const VACATION_OPTIONS: { value: AnalyseVacationMode; label: string }[] = [
  { value: 'all', label: 'Toutes les dates' },
  { value: 'vacances', label: 'Vacances uniquement' },
  { value: 'hors_vacances', label: 'Hors vacances (été exclu)' },
  { value: 'hors_vacances_avec_ete', label: 'Hors vacances (été conservé)' },
];

type Props = {
  filters: AnalyseFilters;
  onChange: (patch: Partial<AnalyseFilters>) => void;
  thresholds: AnalyseThresholds;
  onThresholdsChange: (next: AnalyseThresholds) => void;
  availableYears: number[];
  holidayZone: string;
};

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
    active
      ? 'border-amber-300/60 bg-amber-400/20 text-amber-100'
      : 'border-cyan-200/15 bg-white/5 text-cyan-50/70 hover:border-cyan-200/40 hover:text-white'
  }`;

const inputClass = 'rounded-lg border border-cyan-200/20 bg-[#061f28]/70 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-amber-300/60 [color-scheme:dark]';

const toggleInList = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter(item => item !== value) : [...list, value];

export default function AnalyseFiltersPanel({ filters, onChange, thresholds, onThresholdsChange, availableYears, holidayZone }: Props) {
  const [monthsYear, setMonthsYear] = useState(() => new Date().getFullYear());

  const parseMagnitude = (raw: string, fallback: number) => {
    const value = Number(raw.replace(',', '.'));
    return Number.isFinite(value) ? -Math.abs(value) : fallback;
  };

  return (
    <section className={`${analyseGlass} grid gap-5 p-4 lg:grid-cols-2`}>
      <div className="grid gap-2">
        <div className={analyseLabel}>Période</div>
        <div className="flex gap-2">
          <button type="button" className={chip(filters.periodMode === 'plage')} onClick={() => onChange({ periodMode: 'plage' })}>Plage de dates</button>
          <button type="button" className={chip(filters.periodMode === 'mois')} onClick={() => onChange({ periodMode: 'mois' })}>Mois multiples</button>
        </div>

        {filters.periodMode === 'plage' ? (
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cyan-50/70">
            <input type="date" className={inputClass} value={filters.startDate} onChange={event => onChange({ startDate: event.target.value })} aria-label="Date de début" />
            <span>→</span>
            <input type="date" className={inputClass} value={filters.endDate} onChange={event => onChange({ endDate: event.target.value })} aria-label="Date de fin" />
          </div>
        ) : (
          <div className="grid gap-2">
            <select className={`${inputClass} w-28`} value={monthsYear} onChange={event => setMonthsYear(Number(event.target.value))} aria-label="Année">
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {MONTH_NAMES_SHORT.map((label, month) => {
                const key = monthKey(monthsYear, month);
                return (
                  <button key={key} type="button" className={chip(filters.monthKeys.includes(key))} onClick={() => onChange({ monthKeys: toggleInList(filters.monthKeys, key) })}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-semibold text-cyan-50/50">
              {filters.monthKeys.length} mois sélectionné(s)
              {filters.monthKeys.length > 0 && (
                <button type="button" className="ml-2 underline hover:text-white" onClick={() => onChange({ monthKeys: [] })}>Tout effacer</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <div className={analyseLabel}>Jours de la semaine {filters.weekdays.length === 0 && <span className="text-cyan-50/40">(tous)</span>}</div>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_ORDER.map(day => (
            <button key={day} type="button" className={chip(filters.weekdays.includes(day))} onClick={() => onChange({ weekdays: toggleInList(filters.weekdays, day) })}>
              {WEEKDAY_LABELS[day]}
            </button>
          ))}
          {filters.weekdays.length > 0 && (
            <button type="button" className="px-2 text-[11px] font-semibold text-cyan-50/50 underline hover:text-white" onClick={() => onChange({ weekdays: [] })}>Tous</button>
          )}
        </div>

        <div className={`${analyseLabel} mt-2`}>Service</div>
        <div className="flex gap-2">
          {SERVICE_OPTIONS.map(option => (
            <button key={option.value} type="button" className={chip(filters.service === option.value)} onClick={() => onChange({ service: option.value })}>{option.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <div className={analyseLabel}>Vacances scolaires · zone {holidayZone}</div>
        <div className="flex flex-wrap gap-2">
          {VACATION_OPTIONS.map(option => (
            <button key={option.value} type="button" className={chip(filters.vacationMode === option.value)} onClick={() => onChange({ vacationMode: option.value })}>{option.label}</button>
          ))}
        </div>
        <div className="text-[11px] font-semibold text-cyan-50/50">
          Été conservé : juillet-août reste dans l&apos;échantillon « hors vacances ». Zone du restaurant : Paramètres Entreprise. Calendrier : <code>src/lib/schoolHolidays.json</code>.
        </div>
      </div>

      <div className="grid gap-2">
        <div className={analyseLabel}>Seuils d&apos;alerte (écart défavorable)</div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-cyan-50/70">
          <label className="flex items-center gap-2">
            Écart %
            <input
              type="number" min={0} step={1} className={`${inputClass} w-24`}
              value={Math.abs(thresholds.ecartPct)}
              onChange={event => onThresholdsChange({ ...thresholds, ecartPct: parseMagnitude(event.target.value, thresholds.ecartPct) })}
            />
          </label>
          <label className="flex items-center gap-2">
            Écart €/jour
            <input
              type="number" min={0} step={10} className={`${inputClass} w-24`}
              value={Math.abs(thresholds.ecartEuroJour)}
              onChange={event => onThresholdsChange({ ...thresholds, ecartEuroJour: parseMagnitude(event.target.value, thresholds.ecartEuroJour) })}
            />
          </label>
        </div>
        <div className="text-[11px] font-semibold text-cyan-50/50">
          Orange dès qu&apos;un seuil est atteint (% ou €/jour), rouge à 2× le seuil. Enregistrés sur ce navigateur.
        </div>
      </div>
    </section>
  );
}
