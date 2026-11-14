import type { ShiftPlanningSettings, ShiftServiceWindow, ShiftWeekday } from '@/types/dataTypes';

import { dayLayout } from '../shiftStaffing';

type Props = { settings: ShiftPlanningSettings; onChange: (change: Partial<ShiftPlanningSettings>) => void };

type Mode = 'closed' | 'cut' | 'continuous';

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';
const DAYS: Array<{ day: ShiftWeekday; label: string }> = [
  { day: 1, label: 'Lundi' }, { day: 2, label: 'Mardi' }, { day: 3, label: 'Mercredi' }, { day: 4, label: 'Jeudi' },
  { day: 5, label: 'Vendredi' }, { day: 6, label: 'Samedi' }, { day: 0, label: 'Dimanche' },
];

const withoutDay = (windows: ShiftServiceWindow[], day: number): ShiftServiceWindow[] =>
  windows.map(window => ({ ...window, days: window.days.filter(item => item !== day) })).filter(window => window.days.length > 0);

function TimeInput({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  return <input className={`${field} w-20`} value={value} aria-label={label} onChange={event => onChange(event.target.value)} />;
}

function MinutesInput({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  return <input type="number" min={0} className={`${field} w-16`} value={value} aria-label={label} onChange={event => onChange(Number(event.target.value))} />;
}

// Horaires du restaurant par jour (coupé, continu ou fermé) et réglages dont les horaires des shifts sont déduits.
export default function ShiftHoursEditor({ settings, onChange }: Props) {
  const windows = settings.serviceWindows;

  const setDay = (day: ShiftWeekday, next: ShiftServiceWindow[]) =>
    onChange({ serviceWindows: [...withoutDay(windows, day), ...next.map(window => ({ ...window, days: [day] }))] });

  const changeMode = (day: ShiftWeekday, mode: Mode) => {
    const layout = dayLayout(settings, day);
    if (mode === 'closed') setDay(day, []);
    else if (mode === 'cut') setDay(day, [{ service: 'midi', days: [day], start: '11h30', end: '15h00' }, { service: 'soir', days: [day], start: '18h30', end: '00h00' }]);
    else setDay(day, [{ service: 'midi', days: [day], start: layout.mode === 'cut' && layout.midi ? layout.midi.start : '11h30', end: '23h00' }]);
  };

  const patchWindow = (day: ShiftWeekday, service: ShiftServiceWindow['service'], change: Partial<ShiftServiceWindow>) =>
    setDay(day, windows.filter(window => window.days.includes(day)).map(window => (window.service === service ? { ...window, ...change } : window)));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Horaires du restaurant : jour coupé (midi + soir) ou en continu (une seule plage, relève à l'heure de relève).
          Les horaires des shifts en sont déduits.
        </p>
        {DAYS.map(({ day, label }) => {
          const layout = dayLayout(settings, day);
          const dayWindows = windows.filter(window => window.days.includes(day));
          const midi = dayWindows.find(window => window.service === 'midi');
          const soir = dayWindows.find(window => window.service === 'soir');
          return (
            <div key={day} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
              <span className="w-24 font-semibold text-slate-700">{label}</span>
              <select className={field} value={layout.mode} aria-label={`Organisation ${label}`} onChange={event => changeMode(day, event.target.value as Mode)}>
                <option value="cut">Coupé</option>
                <option value="continuous">En continu</option>
                <option value="closed">Fermé</option>
              </select>
              {layout.mode === 'cut' && (
                <>
                  <span className="text-slate-500">Midi</span>
                  <TimeInput value={midi?.start ?? ''} label={`Début midi ${label}`} onChange={start => patchWindow(day, 'midi', { start })} />
                  <span className="text-slate-400">→</span>
                  <TimeInput value={midi?.end ?? ''} label={`Fin midi ${label}`} onChange={end => patchWindow(day, 'midi', { end })} />
                  <span className="ml-2 text-slate-500">Soir</span>
                  <TimeInput value={soir?.start ?? ''} label={`Début soir ${label}`} onChange={start => patchWindow(day, 'soir', { start })} />
                  <span className="text-slate-400">→</span>
                  <TimeInput value={soir?.end ?? ''} label={`Fermeture ${label}`} onChange={end => patchWindow(day, 'soir', { end })} />
                </>
              )}
              {layout.mode === 'continuous' && (
                <>
                  <TimeInput value={layout.start} label={`Ouverture ${label}`} onChange={start => patchWindow(day, 'midi', { start })} />
                  <span className="text-slate-400">→</span>
                  <TimeInput value={layout.end} label={`Fermeture ${label}`} onChange={end => patchWindow(day, 'midi', { end })} />
                </>
              )}
              {layout.mode !== 'closed' && (
                <div className="ml-auto flex items-center gap-1 text-slate-600">Ouverture cuisine
                  <TimeInput
                    value={settings.kitchenOpenTimes[day]}
                    label={`Ouverture cuisine ${label}`}
                    onChange={value => onChange({ kitchenOpenTimes: { ...settings.kitchenOpenTimes, [day]: value } })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2">Ouverture salle (encadrant, 1 serveur)
          <TimeInput value={settings.salleOpenTime} label="Ouverture salle" onChange={salleOpenTime => onChange({ salleOpenTime })} />
        </div>
        <div className="flex items-center justify-between gap-2">Arrivée par défaut (midi)
          <TimeInput value={settings.defaultArrival} label="Arrivée par défaut" onChange={defaultArrival => onChange({ defaultArrival })} />
        </div>
        <div className="flex items-center justify-between gap-2">Fin du midi : fenêtre + (min)
          <MinutesInput value={settings.midiEndOffsetMin} label="Fin du midi, minutes en plus" onChange={midiEndOffsetMin => onChange({ midiEndOffsetMin })} />
        </div>
        <div className="flex items-center justify-between gap-2">Fermeture : fenêtre + (min)
          <MinutesInput value={settings.closeExtraMin} label="Fermeture, minutes en plus" onChange={closeExtraMin => onChange({ closeExtraMin })} />
        </div>
        <div className="flex items-center justify-between gap-2">Relève (jours en continu)
          <TimeInput value={settings.reliefTime} label="Heure de relève" onChange={reliefTime => onChange({ reliefTime })} />
        </div>
        <div className="flex items-center justify-between gap-2">Chevauchement de la relève (min)
          <MinutesInput value={settings.reliefOverlapMin} label="Chevauchement de la relève" onChange={reliefOverlapMin => onChange({ reliefOverlapMin })} />
        </div>
      </div>
    </div>
  );
}
