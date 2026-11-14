import { formatDecimal, formatEuro } from '@/lib/formatters';

import { BEBAS_FONT } from '../shiftRoleStyle';
import { dateFromIso, formatShortDate } from '../shiftDates';
import type { SurplusLine, WeekSurplus } from '../shiftSurplus';

const DAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const SERVICE_LABELS = { midi: 'Midi', soir: 'Soir' };

const hours = (value: number) => `${formatDecimal(value, 1)} h`;
const prod = (value: number | null) => (value === null ? '—' : `${formatDecimal(value, 0)} €/h`);

function LineCells({ line }: { line: SurplusLine }) {
  return (
    <>
      <td className="px-2 py-1 text-right">{hours(line.neededHours)}</td>
      <td className="px-2 py-1 text-right">{hours(line.plannedHours)}</td>
      <td className="px-2 py-1 text-right font-bold" style={{ color: line.surplusHours > 0 ? '#b45309' : '#16a34a' }}>{hours(line.surplusHours)}</td>
      <td className="px-2 py-1 text-right">{formatEuro(line.surplusCost)}</td>
      <td className="px-2 py-1 text-right">{prod(line.productivityWithoutSurplus)} → {prod(line.productivityWithSurplus)}</td>
    </>
  );
}

// Récapitulatif du surplus : heures nécessaires (besoins seuls) contre heures planifiées, pour la semaine puis jour par jour.
export default function ShiftSurplusPanel({ surplus }: { surplus: WeekSurplus }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-2xl text-slate-900" style={{ fontFamily: BEBAS_FONT }}>Récapitulatif du surplus</h2>
      <p className="mb-3 text-xs text-slate-500">
        Heures nécessaires = besoins seuls (couverts ÷ ratio). Le surplus est la part des heures de contrat posée en renfort au-delà du besoin.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm text-slate-700">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-2 py-1" />
              <th className="px-2 py-1 text-right">Nécessaires</th>
              <th className="px-2 py-1 text-right">Planifiées</th>
              <th className="px-2 py-1 text-right">Surplus</th>
              <th className="px-2 py-1 text-right">Surplus (€)</th>
              <th className="px-2 py-1 text-right">Productivité sans → avec</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
              <td className="px-2 py-1">Semaine</td>
              <LineCells line={surplus.week} />
            </tr>
            {surplus.days.map(day => (
              <tr key={day.date} className="border-t border-slate-100 align-top">
                <td className="px-2 py-1">
                  <div className="font-semibold">{DAY_SHORT[dateFromIso(day.date).getDay()]} {formatShortDate(day.date)}</div>
                  {day.reinforcements.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5 text-[11px] font-normal text-slate-500">
                      {day.reinforcements.map(item => (
                        <li key={`${item.staffKey}-${item.start}`}>
                          {SERVICE_LABELS[item.service]} : {item.name} {item.start}–{item.end} (+{formatDecimal(item.hours, 2)} h)
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <LineCells line={day} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
