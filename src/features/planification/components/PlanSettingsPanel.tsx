import { MONTH_NAMES_SHORT } from '@/lib/constants';
import type { PlanSettings } from '@/types/dataTypes';

import { analyseGlass, analyseLabel } from '../../analyse/components/analyseStyles';

import PlanAnnualCaField from './PlanAnnualCaField';
import PlanNumberInput from './PlanNumberInput';

type PlanSettingsPanelProps = {
  settings: PlanSettings;
  targetYearOptions: number[];
  baseYears: number[];
  holidayZone: string;
  sampleCount: number;
  annualProposal: number;
  vaeProposal: number;
  onChange: (patch: Partial<PlanSettings>) => void;
  onMonthGrowth: (key: 'cvGrowthByMonth' | 'tmIncreaseEurByMonth', month: number, value: number | null) => void;
};

export default function PlanSettingsPanel({
  settings, targetYearOptions, baseYears, holidayZone, sampleCount, annualProposal, vaeProposal, onChange, onMonthGrowth,
}: PlanSettingsPanelProps) {
  const [olderYear, recentYear] = baseYears;
  const hasCaTarget = settings.targetAnnualCA !== null || Object.values(settings.targetMonthlyCA).some(v => typeof v === 'number');
  return (
    <section className={`${analyseGlass} grid gap-4 p-4`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

        <PlanAnnualCaField
          label="CA annuel"
          year={settings.targetYear}
          value={settings.targetAnnualCA}
          proposal={annualProposal}
          onApply={value => onChange(value === null ? { targetAnnualCA: null, targetMonthlyCA: {} } : { targetAnnualCA: value })}
        />

        <PlanAnnualCaField
          label="VAE annuel"
          year={settings.targetYear}
          value={settings.targetAnnualVAE}
          proposal={vaeProposal}
          onApply={value => onChange(value === null ? { targetAnnualVAE: null, targetMonthlyVAE: {} } : { targetAnnualVAE: value })}
        />

        <div className="grid gap-1">
          <span className={analyseLabel}>Croissance couverts (%)</span>
          <PlanNumberInput ariaLabel="Croissance couverts" value={settings.cvGrowthPct} step={0.5} onCommit={v => v !== null && onChange({ cvGrowthPct: v })} />
          {hasCaTarget && <span className="text-[11px] font-semibold text-amber-200/80">S'ajoute au CA cible : CA du mois = cible × (1 + croissance).</span>}
        </div>

        <div className="grid gap-1">
          <span className={analyseLabel}>Hausse TM (€) — ex. 0,10 / 0,20 / 0,25</span>
          <PlanNumberInput ariaLabel="Hausse TM en euros" value={settings.tmIncreaseEur} step={0.05} onCommit={v => v !== null && onChange({ tmIncreaseEur: Math.max(0, v) })} />
          <span className="text-[11px] font-semibold text-cyan-50/60">Ajoutée au TM de référence (au moins N-1), le CA monte d'autant.</span>
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
              {([['cvGrowthByMonth', 'Couverts %'], ['tmIncreaseEurByMonth', 'TM €']] as const).map(([key, label]) => (
                <tr key={key}>
                  <td className="whitespace-nowrap pr-2 text-[11px] font-bold text-cyan-50/80">{label}</td>
                  {MONTH_NAMES_SHORT.map((name, month) => (
                    <td key={name} className="px-0.5 py-0.5">
                      <PlanNumberInput
                        ariaLabel={`${label} ${name}`}
                        value={settings[key][month] ?? null}
                        placeholder={String(key === 'cvGrowthByMonth' ? settings.cvGrowthPct : settings.tmIncreaseEur)}
                        step={key === 'cvGrowthByMonth' ? 0.5 : 0.05}
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
