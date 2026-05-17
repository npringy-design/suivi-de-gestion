import { useMemo } from 'react';

import { averagePayrollRate } from '@/personnelSalaryImport';
import { parseHourInputToDecimal } from '@/utils';

type DashboardAnalysisViewProps = {
  rows: Array<any>;
  calculatedData: Record<string, string>;
  salariesConfig?: Record<string, Array<{ heures?: string; coutGlobal?: string; department?: 'cuisine' | 'salle' }>>;
  isMobile: boolean;
};

type AnalysisRow = {
  key: string;
  label: string;
  weekIndex: number;
  caTotal: number;
  caRestaurant: number;
  couverts: number;
  tmRestaurant: number;
  heuresCuisine: number;
  heuresSalle: number;
  coutCuisine: number;
  coutSalle: number;
  coutTotal: number;
  scTotal: number;
  scCuisine: number | null;
  scSalle: number | null;
};

const payrollColumns = [
  { category: 'cadre', section: 'cuisine' as const, col: 77, fallback: 38.54 },
  { category: 'cadre', section: 'salle' as const, col: 78, fallback: 38.54 },
  { category: 'maitrise', section: 'cuisine' as const, col: 79, fallback: 20.85 },
  { category: 'maitrise', section: 'salle' as const, col: 80, fallback: 20.85 },
  { category: 'niv12', section: 'cuisine' as const, col: 81, fallback: 16.04 },
  { category: 'niv12', section: 'salle' as const, col: 82, fallback: 16.04 },
  { category: 'niv3', section: 'cuisine' as const, col: 83, fallback: 18.35 },
  { category: 'niv3', section: 'salle' as const, col: 84, fallback: 18.35 },
  { category: 'apprenti', section: 'cuisine' as const, col: 85, fallback: 8.39 },
  { category: 'apprenti', section: 'salle' as const, col: 86, fallback: 8.39 },
];

const parseValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
};

const parseHour = (value: unknown) => {
  const converted = parseHourInputToDecimal(String(value || '0'));
  return Number.isFinite(converted) && converted > 0 ? Math.round(converted * 100) / 100 : 0;
};

const ratio = (value: number, total: number) => total > 0 ? (value / total) * 100 : null;

const euro = (value: number) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

const percent = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(value)
  ? '-'
  : `${value.toFixed(2).replace('.', ',')} %`;

const number2 = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const integer = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0);

const summarize = (rows: AnalysisRow[], label: string, weekIndex = 0): AnalysisRow => {
  const totals = rows.reduce((acc, row) => ({
    caTotal: acc.caTotal + row.caTotal,
    caRestaurant: acc.caRestaurant + row.caRestaurant,
    couverts: acc.couverts + row.couverts,
    heuresCuisine: acc.heuresCuisine + row.heuresCuisine,
    heuresSalle: acc.heuresSalle + row.heuresSalle,
    coutCuisine: acc.coutCuisine + row.coutCuisine,
    coutSalle: acc.coutSalle + row.coutSalle,
    coutTotal: acc.coutTotal + row.coutTotal,
  }), { caTotal: 0, caRestaurant: 0, couverts: 0, heuresCuisine: 0, heuresSalle: 0, coutCuisine: 0, coutSalle: 0, coutTotal: 0 });

  return {
    key: label,
    label,
    weekIndex,
    ...totals,
    tmRestaurant: totals.couverts > 0 ? totals.caRestaurant / totals.couverts : 0,
    scTotal: ratio(totals.coutTotal, totals.caTotal) || 0,
    scCuisine: ratio(totals.coutCuisine, totals.caTotal),
    scSalle: ratio(totals.coutSalle, totals.caTotal),
  };
};

export default function DashboardAnalysisView({ rows, calculatedData, salariesConfig, isMobile }: DashboardAnalysisViewProps) {
  const analysis = useMemo(() => {
    const rateFor = (category: string, section: 'cuisine' | 'salle', fallback: number) => averagePayrollRate(salariesConfig?.[category] || [], section) || fallback;

    const days = rows
      .map((row, rowIndex) => {
        if (row.type !== 'day') return null;
        const key = (col: number) => `${rowIndex}-${col}`;
        const caVae = parseValue(calculatedData[key(17)]);
        const caMidi = parseValue(calculatedData[key(18)]);
        const caSoir = parseValue(calculatedData[key(19)]);
        const caLimo = parseValue(calculatedData[key(20)]);
        const caTotal = parseValue(calculatedData[key(21)]) || caVae + caMidi + caSoir + caLimo;
        const caRestaurant = caMidi + caSoir;
        const couverts = parseValue(calculatedData[key(29)]) || parseValue(calculatedData[key(25)]) + parseValue(calculatedData[key(27)]);
        const tmRestaurant = parseValue(calculatedData[key(30)]) || (couverts > 0 ? caRestaurant / couverts : 0);

        let heuresCuisine = 0;
        let heuresSalle = 0;
        let coutCuisine = 0;
        let coutSalle = 0;

        payrollColumns.forEach(column => {
          const heures = parseHour(calculatedData[key(column.col)]);
          const cout = heures * rateFor(column.category, column.section, column.fallback);
          if (column.section === 'cuisine') {
            heuresCuisine += heures;
            coutCuisine += cout;
          } else {
            heuresSalle += heures;
            coutSalle += cout;
          }
        });

        const coutTotal = parseValue(calculatedData[key(87)]) || coutCuisine + coutSalle;
        const scTotal = parseValue(calculatedData[key(89)]) || ratio(coutTotal, caTotal) || 0;
        const label = row.dateObj
          ? row.dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })
          : row.label;

        return {
          key: String(rowIndex),
          label,
          weekIndex: row.weekIndex || 1,
          caTotal,
          caRestaurant,
          couverts,
          tmRestaurant,
          heuresCuisine,
          heuresSalle,
          coutCuisine,
          coutSalle,
          coutTotal,
          scTotal,
          scCuisine: ratio(coutCuisine, caTotal),
          scSalle: ratio(coutSalle, caTotal),
        };
      })
      .filter(Boolean) as AnalysisRow[];

    const weeks = Array.from(new Set(days.map(day => day.weekIndex))).map(weekIndex => summarize(days.filter(day => day.weekIndex === weekIndex), `Semaine ${weekIndex}`, weekIndex));
    const monthTotal = summarize(days, 'Total fin de mois');
    const activeDays = days.filter(day => day.caTotal > 0 || day.coutTotal > 0);
    const bestDay = [...activeDays].sort((a, b) => (a.scTotal || 999) - (b.scTotal || 999))[0] || null;
    const worstDay = [...activeDays].sort((a, b) => (b.scTotal || 0) - (a.scTotal || 0))[0] || null;

    return { days, weeks, monthTotal, bestDay, worstDay };
  }, [rows, calculatedData, salariesConfig]);

  const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5';
  const th = 'px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500';
  const td = 'px-3 py-2 text-sm font-semibold text-slate-700';

  const MiniList = ({ title, value, color, children }: { title: string; value: string; color: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">{title}</div>
        <div className="text-sm font-black" style={{ color }}>{value}</div>
      </div>
      <div className="grid max-h-[390px] gap-1.5 overflow-y-auto p-2">{children}</div>
    </div>
  );

  const RowValue = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm font-bold capitalize text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
        <div className={card}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">CA réalisé mois</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{euro(analysis.monthTotal.caTotal)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Total suivi quotidien complet</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">S/C mois</div>
          <div className="mt-2 text-2xl font-black text-cyan-800">{percent(analysis.monthTotal.scTotal)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Coût salarial / CA</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Cuisine</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{euro(analysis.monthTotal.coutCuisine)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{percent(analysis.monthTotal.scCuisine)} du CA</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Salle</div>
          <div className="mt-2 text-2xl font-black text-teal-700">{euro(analysis.monthTotal.coutSalle)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{percent(analysis.monthTotal.scSalle)} du CA</div>
        </div>
      </section>

      <section className={`grid min-h-0 gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <MiniList title="S/C par jour" value={percent(analysis.monthTotal.scTotal)} color="#0e7490">
          {analysis.days.map(day => <RowValue key={day.key} label={day.label} value={percent(day.scTotal)} />)}
        </MiniList>
        <MiniList title="CA par jour" value={euro(analysis.monthTotal.caTotal)} color="#2563eb">
          {analysis.days.map(day => <RowValue key={day.key} label={day.label} value={euro(day.caTotal)} />)}
        </MiniList>
      </section>

      <section className={`grid min-h-0 gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]'}`}>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Cuisine / Salle par jour</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Coût et poids dans le CA réalisé.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50">
                  <th className={th}>Jour</th><th className={th}>CA</th><th className={th}>S/C</th><th className={th}>Cuisine €</th><th className={th}>Cuisine %</th><th className={th}>Salle €</th><th className={th}>Salle %</th><th className={th}>TM resto</th>
                </tr>
              </thead>
              <tbody>
                {analysis.days.map(day => (
                  <tr key={day.key} className="odd:bg-white even:bg-slate-50/60">
                    <td className={`${td} font-black capitalize`}>{day.label}</td>
                    <td className={td}>{euro(day.caTotal)}</td>
                    <td className={`${td} font-black text-cyan-800`}>{percent(day.scTotal)}</td>
                    <td className={td}>{euro(day.coutCuisine)}</td>
                    <td className={td}>{percent(day.scCuisine)}</td>
                    <td className={td}>{euro(day.coutSalle)}</td>
                    <td className={td}>{percent(day.scSalle)}</td>
                    <td className={td}>{euro(day.tmRestaurant)}</td>
                  </tr>
                ))}
                <tr className="bg-cyan-50">
                  <td className={`${td} font-black`}>Total fin de mois</td>
                  <td className={`${td} font-black`}>{euro(analysis.monthTotal.caTotal)}</td>
                  <td className={`${td} font-black text-cyan-900`}>{percent(analysis.monthTotal.scTotal)}</td>
                  <td className={`${td} font-black`}>{euro(analysis.monthTotal.coutCuisine)}</td>
                  <td className={`${td} font-black`}>{percent(analysis.monthTotal.scCuisine)}</td>
                  <td className={`${td} font-black`}>{euro(analysis.monthTotal.coutSalle)}</td>
                  <td className={`${td} font-black`}>{percent(analysis.monthTotal.scSalle)}</td>
                  <td className={`${td} font-black`}>{euro(analysis.monthTotal.tmRestaurant)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3">
          <div className={card}>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Récap semaine</div>
            <div className="mt-3 grid gap-2">
              {analysis.weeks.map(week => (
                <div key={week.key} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3"><strong>{week.label}</strong><strong className="text-cyan-800">{percent(week.scTotal)}</strong></div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs font-bold text-slate-500"><span>CA {euro(week.caTotal)}</span><span>TM {euro(week.tmRestaurant)}</span></div>
                  <div className="mt-1 text-xs font-bold text-slate-500">Cuisine {euro(week.coutCuisine)} · Salle {euro(week.coutSalle)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={card}>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Lecture rapide</div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-xl bg-emerald-50 p-3"><div className="text-[11px] font-black uppercase text-emerald-700">Meilleur jour S/C</div><div className="mt-1 font-black capitalize text-emerald-950">{analysis.bestDay ? `${analysis.bestDay.label} · ${percent(analysis.bestDay.scTotal)}` : '-'}</div></div>
              <div className="rounded-xl bg-rose-50 p-3"><div className="text-[11px] font-black uppercase text-rose-700">Jour le plus lourd</div><div className="mt-1 font-black capitalize text-rose-950">{analysis.worstDay ? `${analysis.worstDay.label} · ${percent(analysis.worstDay.scTotal)}` : '-'}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] font-black uppercase text-slate-500">Heures réalisées</div><div className="mt-1 font-black text-slate-950">Cuisine {number2(analysis.monthTotal.heuresCuisine)} h · Salle {number2(analysis.monthTotal.heuresSalle)} h</div></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
