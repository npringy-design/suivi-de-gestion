import { RotateCcw } from 'lucide-react';

import { MONTH_NAMES } from '@/lib/constants';
import type { PlanDay, PlanManualOverride, PlanService } from '@/types/dataTypes';

import { analyseGlass, analyseLabel } from '../../analyse/components/analyseStyles';
import { dayConfidence } from '../planningEngine';
import PlanConfidenceBadge from './PlanConfidenceBadge';
import PlanNumberInput from './PlanNumberInput';

type PlanDayTableProps = {
  plan: PlanDay[];
  month: number;
  onMonthChange: (month: number) => void;
  onlyToCheck: boolean;
  onOnlyToCheckChange: (value: boolean) => void;
  overrides: Record<string, PlanManualOverride>;
  onEdit: (date: string, service: PlanService, field: 'cv' | 'tm' | 'ca', value: number) => void;
  onReset: (date: string) => void;
};

const WEEKDAYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const STATUS_STYLE = {
  vacances: 'bg-violet-400/20 text-violet-200',
  ete: 'bg-orange-400/20 text-orange-200',
  hors_vacances: 'bg-white/10 text-cyan-100/70',
} as const;
const STATUS_LABEL = { vacances: 'Vacances', ete: 'Été', hors_vacances: 'Hors vac.' } as const;

const ROW_TINT = { fiable: '', faible: 'bg-amber-400/[0.06]', critique: 'bg-rose-500/[0.10]' } as const;

const th = `px-1.5 py-2 text-right ${analyseLabel}`;

export default function PlanDayTable({
  plan, month, onMonthChange, onlyToCheck, onOnlyToCheckChange, overrides, onEdit, onReset,
}: PlanDayTableProps) {
  const monthDays = plan.filter(day => day.month === month);
  const rows = onlyToCheck ? monthDays.filter(day => dayConfidence(day) !== 'fiable') : monthDays;

  const renderService = (day: PlanDay, service: PlanService) => {
    const p = day[service];
    const label = `${day.date} ${service}`;
    return (
      <>
        <td className="px-1 py-1"><PlanNumberInput ariaLabel={`Couverts ${label}`} value={p.cv} highlight={p.manual} onCommit={v => v !== null && onEdit(day.date, service, 'cv', v)} /></td>
        <td className="px-1 py-1"><PlanNumberInput ariaLabel={`TM ${label}`} value={p.tm} step={0.01} highlight={p.manual} onCommit={v => v !== null && onEdit(day.date, service, 'tm', v)} /></td>
        <td className="px-1 py-1"><PlanNumberInput ariaLabel={`CA ${label}`} value={p.ca} step={0.01} highlight={p.manual} onCommit={v => v !== null && onEdit(day.date, service, 'ca', v)} /></td>
        <td className="px-1 py-1 text-center"><PlanConfidenceBadge proposal={p} /></td>
      </>
    );
  };

  return (
    <div className={`${analyseGlass} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {MONTH_NAMES.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => onMonthChange(index)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition-colors ${index === month ? 'bg-amber-300 text-slate-900' : 'bg-white/[0.07] text-cyan-100/70 hover:bg-white/15'}`}
            >
              {name.slice(0, 4)}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[11px] font-bold text-cyan-50/80">
          <input type="checkbox" checked={onlyToCheck} onChange={event => onOnlyToCheckChange(event.target.checked)} />
          Jours à faible confiance seulement
        </label>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0a2430]">
            <tr className="border-b border-white/10">
              <th className={`${th} text-left`} rowSpan={2}>Jour</th>
              <th className={th} rowSpan={2}>Statut</th>
              <th className={`${th} text-center`} colSpan={4}>Midi</th>
              <th className={`${th} text-center`} colSpan={4}>Soir</th>
              <th className={th} rowSpan={2}>CA jour</th>
              <th className={th} rowSpan={2} />
            </tr>
            <tr className="border-b border-white/10">
              {['Couverts', 'TM', 'CA', 'Confiance', 'Couverts', 'TM', 'CA', 'Confiance'].map((label, i) => (
                <th key={`${label}-${i}`} className={`${th} ${label === 'Confiance' ? 'text-center' : ''}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(day => (
              <tr key={day.date} className={`border-b border-white/5 ${ROW_TINT[dayConfidence(day)]}`}>
                <td className="whitespace-nowrap px-2 py-1 text-xs font-black text-amber-50">
                  {WEEKDAYS[day.weekday]} {String(day.day).padStart(2, '0')}
                </td>
                <td className="px-1.5 py-1 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLE[day.status]}`}>{STATUS_LABEL[day.status]}</span>
                </td>
                {renderService(day, 'midi')}
                {renderService(day, 'soir')}
                <td className="whitespace-nowrap px-2 py-1 text-right text-xs font-black tabular-nums text-white">
                  {(day.midi.ca + day.soir.ca).toFixed(2)} €
                </td>
                <td className="px-1 py-1 text-center">
                  {overrides[day.date] && (
                    <button type="button" title="Revenir à la proposition" aria-label={`Réinitialiser ${day.date}`} onClick={() => onReset(day.date)} className="text-cyan-100/60 hover:text-white">
                      <RotateCcw size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-6 text-center text-xs font-semibold text-cyan-50/50">Aucun jour à vérifier ce mois-ci.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
