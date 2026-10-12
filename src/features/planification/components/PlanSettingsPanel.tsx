import { MONTH_NAMES_SHORT } from '@/lib/constants';
import { formatEuroSymbol } from '@/lib/formatters';
import type { PlanSettings } from '@/types/dataTypes';

import { analyseGlass, analyseLabel } from '../../analyse/components/analyseStyles';

import PlanNumberInput from './PlanNumberInput';

type PlanSettingsPanelProps = {
  settings: PlanSettings;
  targetYearOptions: number[];
  baseYears: number[];
  holidayZone: string;
  sampleCount: number;
  annualProposal: number;
  onChange: (patch: Partial<PlanSettings>) => void;
  onMonthGrowth: (key: 'cvGrowthByMonth' | 'tmGrowthByMonth', month: number, value: number | null) => void;
};

export default function PlanSettingsPanel({
  settings, targetYearOptions, baseYears, holidayZone, sampleCount, annualProposal, onChange, onMonthGrowth,
}: PlanSettingsPanelProps) {
  const [olderYear, recentYear] = baseYears;
  return (
    <section className={`${analyseGlass} grid gap-4 p-4`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1">
          <span className={analyseLabel}>Année cible</span>
          <select
            value={settings.targetYear}
            onChange={event => onChange({ targetYear: Number(event.target.value) })}
            className="rounded-md border border-white/10 bg-[#0a2430] px-2 py-1.5 text-sm font-bold text-white"
          >
            {targetYearOptions.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <div className="grid gap-1">
          <span className={analyseLabel}>CA annuel {settings.targetYear}</span>
          <PlanNumberInput
            ariaLabel={`CA annuel ${settings.targetYear}`}
            value={settings.targetAnnualCA}
            placeholder={String(annualProposal)}
            step={1000}
            allowEmpty
            highlight={settings.targetAnnualCA !== null}
            onCommit={value => onChange({ targetAnnualCA: value })}
          />
          <span className="text-[11px] font-semibold text-cyan-50/60">
            Proposition : {formatEuroSymbol(annualProposal)} (moyenne {olderYear}-{recentYear}){' '}
            <button type="button" onClick={() => onChange({ targetAnnualCA: annualProposal })} className="font-black text-amber-200 underline hover:text-amber-100">
              Utiliser
            </button>
            {settings.targetAnnualCA !== null && (
              <> · <button type="button" onClick={() => onChange({ targetAnnualCA: null, targetMonthlyCA: {} })} className="font-black text-amber-200 underline hover:text-amber-100">Retirer l&apos;objectif</button></>
            )}
          </span>
        </div>

        <div className="grid gap-1">
          <span className={analyseLabel}>Croissance couverts (%)</span>
          <PlanNumberInput ariaLabel="Croissance couverts" value={settings.cvGrowthPct} step={0.5} onCommit={v => v !== null && onChange({ cvGrowthPct: v })} />
        </div>

        <div className="grid gap-1">
          <span className={analyseLabel}>Croissance TM (%) — revalorisation carte</span>
          <PlanNumberInput ariaLabel="Croissance TM" value={settings.tmGrowthPct} step={0.5} onCommit={v => v !== null && onChange({ tmGrowthPct: v })} />
        </div>
      </div>

      <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-cyan-100/80">
          Croissance par mois (surcharge optionnelle — vide = valeur globale)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th />
                {MONTH_NAMES_SHORT.map(name => <th key={name} className={`px-1 pb-1 ${analyseLabel}`}>{name}</th>)}
              </tr>
            </thead>
            <tbody>
              {([['cvGrowthByMonth', 'Couverts %'], ['tmGrowthByMonth', 'TM %']] as const).map(([key, label]) => (
                <tr key={key}>
                  <td className="whitespace-nowrap pr-2 text-[11px] font-bold text-cyan-50/80">{label}</td>
                  {MONTH_NAMES_SHORT.map((name, month) => (
                    <td key={name} className="px-0.5 py-0.5">
                      <PlanNumberInput
                        ariaLabel={`${label} ${name}`}
                        value={settings[key][month] ?? null}
                        placeholder={String(key === 'cvGrowthByMonth' ? settings.cvGrowthPct : settings.tmGrowthPct)}
                        step={0.5}
                        allowEmpty
                        highlight={settings[key][month] !== undefined}
                        onCommit={value => onMonthGrowth(key, month, value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="text-[11px] font-semibold text-cyan-50/50">
        Zone scolaire du restaurant : {holidayZone} · {sampleCount} jour(s) réalisé(s) {olderYear}-{recentYear} analysé(s) · simulation en mémoire, rien n&apos;est enregistré tant que vous n&apos;avez pas cliqué sur « Écrire dans les Prévisions ».
      </p>
    </section>
  );
}
