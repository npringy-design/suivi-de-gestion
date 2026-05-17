import { useMemo } from 'react';

import { useData } from '@/contexts/DataContext';
import { getDashboardRowIndices, parseHourInputToDecimal } from './utils';

interface ReportingProps {
  onBack: () => void;
  hideHeader?: boolean;
}

type Section = 'cuisine' | 'salle';

type PayrollColumn = {
  label: string;
  section: Section;
  category: string;
  col: number;
  legacyCol: number;
  fallbackRate: number;
};

type DayAnalysis = {
  day: number;
  label: string;
  week: number;
  caTotal: number;
  caResto: number;
  caVae: number;
  caLimo: number;
  covers: number;
  tmResto: number;
  hoursCuisine: number;
  hoursSalle: number;
  costCuisine: number;
  costSalle: number;
  costTotal: number;
  scTotal: number | null;
  scCuisine: number | null;
  scSalle: number | null;
};

const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const weekdayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const payrollColumns: PayrollColumn[] = [
  { label: 'Cadre cuisine', section: 'cuisine', category: 'cadre', col: 77, legacyCol: 91, fallbackRate: 38.54 },
  { label: 'Cadre salle', section: 'salle', category: 'cadre', col: 78, legacyCol: 92, fallbackRate: 38.54 },
  { label: 'Maitrise cuisine', section: 'cuisine', category: 'maitrise', col: 79, legacyCol: 93, fallbackRate: 20.85 },
  { label: 'Maitrise salle', section: 'salle', category: 'maitrise', col: 80, legacyCol: 94, fallbackRate: 20.85 },
  { label: 'Niv I-II cuisine', section: 'cuisine', category: 'niv12', col: 81, legacyCol: 95, fallbackRate: 16.04 },
  { label: 'Niv I-II salle', section: 'salle', category: 'niv12', col: 82, legacyCol: 96, fallbackRate: 16.04 },
  { label: 'Niv III cuisine', section: 'cuisine', category: 'niv3', col: 83, legacyCol: 97, fallbackRate: 18.35 },
  { label: 'Niv III salle', section: 'salle', category: 'niv3', col: 84, legacyCol: 98, fallbackRate: 18.35 },
  { label: 'Apprenti cuisine', section: 'cuisine', category: 'apprenti', col: 85, legacyCol: 99, fallbackRate: 8.39 },
  { label: 'Apprenti salle', section: 'salle', category: 'apprenti', col: 86, legacyCol: 100, fallbackRate: 8.39 },
];

const numberValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
};

const euro = (value: number) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

const percent = (value: number | null) => value === null || !Number.isFinite(value)
  ? '-'
  : `${value.toFixed(2).replace('.', ',')} %`;

const integer = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0);

const ratio = (numerator: number, denominator: number) => denominator > 0 ? (numerator / denominator) * 100 : null;

const summarize = (rows: DayAnalysis[]): DayAnalysis => {
  const total = rows.reduce((acc, row) => ({
    ...acc,
    caTotal: acc.caTotal + row.caTotal,
    caResto: acc.caResto + row.caResto,
    caVae: acc.caVae + row.caVae,
    caLimo: acc.caLimo + row.caLimo,
    covers: acc.covers + row.covers,
    hoursCuisine: acc.hoursCuisine + row.hoursCuisine,
    hoursSalle: acc.hoursSalle + row.hoursSalle,
    costCuisine: acc.costCuisine + row.costCuisine,
    costSalle: acc.costSalle + row.costSalle,
    costTotal: acc.costTotal + row.costTotal,
  }), {
    day: 0,
    label: 'Total',
    week: 0,
    caTotal: 0,
    caResto: 0,
    caVae: 0,
    caLimo: 0,
    covers: 0,
    tmResto: 0,
    hoursCuisine: 0,
    hoursSalle: 0,
    costCuisine: 0,
    costSalle: 0,
    costTotal: 0,
    scTotal: null,
    scCuisine: null,
    scSalle: null,
  } as DayAnalysis);

  total.tmResto = total.covers > 0 ? total.caResto / total.covers : 0;
  total.scTotal = ratio(total.costTotal, total.caTotal);
  total.scCuisine = ratio(total.costCuisine, total.caTotal);
  total.scSalle = ratio(total.costSalle, total.caTotal);
  return total;
};

export default function Reporting({ onBack, hideHeader = false }: ReportingProps) {
  const { data, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useData();

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  const analysis = useMemo(() => {
    const monthData = data[selectedMonth];
    const dashboard = monthData?.dashboard || {};
    const salaries = monthData?.salariesConfig?.categories || {};
    const indices = getDashboardRowIndices(selectedMonth, selectedYear);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const cell = (row: number, col: number) => dashboard[`${row}-${col}`];
    const rateFor = (column: PayrollColumn) => {
      const rows = ((salaries as Record<string, Array<{ heures?: string; coutGlobal?: string; department?: string }>>)[column.category] || [])
        .filter(row => !row.department || row.department === column.section);
      const rates = rows
        .map(row => {
          const hours = parseHourInputToDecimal(row.heures || '0');
          const cost = numberValue(row.coutGlobal);
          return hours > 0 && cost > 0 ? (cost * 1.1) / hours : 0;
        })
        .filter(value => value > 0);
      return rates.length > 0 ? rates.reduce((sum, value) => sum + value, 0) / rates.length : column.fallbackRate;
    };

    const rates = payrollColumns.map(column => ({ ...column, rate: rateFor(column) }));
    const days: DayAnalysis[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const rowIndex = indices[day];
      const date = new Date(selectedYear, selectedMonth, day);
      let week = 1;
      for (let d = 1; d < day; d += 1) {
        if (new Date(selectedYear, selectedMonth, d).getDay() === 0) week += 1;
      }

      const caVae = numberValue(cell(rowIndex, 17));
      const caMidi = numberValue(cell(rowIndex, 18));
      const caSoir = numberValue(cell(rowIndex, 19));
      const caLimo = numberValue(cell(rowIndex, 20));
      const caTotal = caVae + caMidi + caSoir + caLimo;
      const caResto = caMidi + caSoir;
      const covers = numberValue(cell(rowIndex, 25)) + numberValue(cell(rowIndex, 27));

      let hoursCuisine = 0;
      let hoursSalle = 0;
      let costCuisine = 0;
      let costSalle = 0;

      rates.forEach(column => {
        const rawHours = cell(rowIndex, column.col) || cell(rowIndex, column.legacyCol) || '';
        const hours = Math.round(parseHourInputToDecimal(rawHours || '0') * 100) / 100;
        const cost = hours * column.rate;
        if (column.section === 'cuisine') {
          hoursCuisine += hours;
          costCuisine += cost;
        } else {
          hoursSalle += hours;
          costSalle += cost;
        }
      });

      const costTotal = costCuisine + costSalle;
      days.push({
        day,
        label: `${weekdayNames[date.getDay()]} ${day}`,
        week,
        caTotal,
        caResto,
        caVae,
        caLimo,
        covers,
        tmResto: covers > 0 ? caResto / covers : 0,
        hoursCuisine,
        hoursSalle,
        costCuisine,
        costSalle,
        costTotal,
        scTotal: ratio(costTotal, caTotal),
        scCuisine: ratio(costCuisine, caTotal),
        scSalle: ratio(costSalle, caTotal),
      });
    }

    const weeks = Array.from(new Set(days.map(day => day.week))).map(week => ({
      week,
      rows: days.filter(day => day.week === week),
      total: summarize(days.filter(day => day.week === week)),
    }));

    const monthTotal = summarize(days);
    const bestDay = [...days].filter(day => day.caTotal > 0).sort((a, b) => (a.scTotal || 999) - (b.scTotal || 999))[0];
    const worstDay = [...days].filter(day => day.caTotal > 0).sort((a, b) => (b.scTotal || 0) - (a.scTotal || 0))[0];

    return { days, weeks, monthTotal, bestDay, worstDay };
  }, [data, selectedMonth, selectedYear]);

  const cardStyle = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
  const headerCell = 'px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500';
  const bodyCell = 'px-3 py-2 text-sm font-semibold text-slate-700';
  const totalCell = 'px-3 py-2 text-sm font-black text-slate-950';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-amber-50/30 p-4 lg:p-6">
      {!hideHeader && (
        <div className="mb-5 flex flex-col gap-3 rounded-3xl bg-slate-950 p-4 text-white shadow-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button onClick={onBack} className="mb-2 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-bold text-cyan-50 hover:bg-white/15">
              ← Retour accueil
            </button>
            <h1 className="text-2xl font-black tracking-tight lg:text-3xl">Analyse opérationnelle</h1>
            <p className="mt-1 text-sm font-medium text-cyan-100/75">CA, S/C, cuisine et salle — lecture synthétique issue du suivi quotidien complet.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-[320px]">
            <select value={selectedMonth} onChange={event => setSelectedMonth(Number(event.target.value))} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white outline-none">
              {monthNames.map((label, index) => <option key={label} value={index} className="text-slate-950">{label}</option>)}
            </select>
            <select value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white outline-none">
              {years.map(year => <option key={year} value={year} className="text-slate-950">{year}</option>)}
            </select>
          </div>
        </div>
      )}

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardStyle}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">CA réalisé mois</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{euro(analysis.monthTotal.caTotal)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Restaurant + VAE + limonade</div>
        </div>
        <div className={cardStyle}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">S/C mois</div>
          <div className="mt-2 text-3xl font-black text-cyan-800">{percent(analysis.monthTotal.scTotal)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Coût salarial réalisé / CA réalisé</div>
        </div>
        <div className={cardStyle}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Cuisine</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{euro(analysis.monthTotal.costCuisine)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{percent(analysis.monthTotal.scCuisine)} du CA</div>
        </div>
        <div className={cardStyle}>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Salle</div>
          <div className="mt-2 text-2xl font-black text-teal-700">{euro(analysis.monthTotal.costSalle)}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{percent(analysis.monthTotal.scSalle)} du CA</div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 lg:grid-cols-2">
        <div className={cardStyle}>
          <div className="mb-3 text-sm font-black uppercase tracking-[0.15em] text-slate-600">Récap semaine</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0">
              <thead className="bg-slate-50">
                <tr>
                  <th className={headerCell}>Semaine</th>
                  <th className={headerCell}>CA</th>
                  <th className={headerCell}>S/C</th>
                  <th className={headerCell}>Cuisine</th>
                  <th className={headerCell}>Salle</th>
                  <th className={headerCell}>TM resto</th>
                </tr>
              </thead>
              <tbody>
                {analysis.weeks.map(({ week, total }) => (
                  <tr key={week} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60">
                    <td className={bodyCell}>Semaine {week}</td>
                    <td className={bodyCell}>{euro(total.caTotal)}</td>
                    <td className={bodyCell}>{percent(total.scTotal)}</td>
                    <td className={bodyCell}>{euro(total.costCuisine)} · {percent(total.scCuisine)}</td>
                    <td className={bodyCell}>{euro(total.costSalle)} · {percent(total.scSalle)}</td>
                    <td className={bodyCell}>{euro(total.tmResto)}</td>
                  </tr>
                ))}
                <tr className="bg-cyan-50">
                  <td className={totalCell}>Total mois</td>
                  <td className={totalCell}>{euro(analysis.monthTotal.caTotal)}</td>
                  <td className={totalCell}>{percent(analysis.monthTotal.scTotal)}</td>
                  <td className={totalCell}>{euro(analysis.monthTotal.costCuisine)} · {percent(analysis.monthTotal.scCuisine)}</td>
                  <td className={totalCell}>{euro(analysis.monthTotal.costSalle)} · {percent(analysis.monthTotal.scSalle)}</td>
                  <td className={totalCell}>{euro(analysis.monthTotal.tmResto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="mb-3 text-sm font-black uppercase tracking-[0.15em] text-slate-600">Lecture rapide</div>
          <div className="grid gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Meilleur jour S/C</div>
              <div className="mt-1 text-xl font-black text-emerald-950">{analysis.bestDay ? `${analysis.bestDay.label} · ${percent(analysis.bestDay.scTotal)}` : '-'}</div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">Jour le plus lourd</div>
              <div className="mt-1 text-xl font-black text-rose-950">{analysis.worstDay ? `${analysis.worstDay.label} · ${percent(analysis.worstDay.scTotal)}` : '-'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Heures réalisées</div>
              <div className="mt-1 text-xl font-black text-slate-950">
                Cuisine {analysis.monthTotal.hoursCuisine.toFixed(2).replace('.', ',')} h · Salle {analysis.monthTotal.hoursSalle.toFixed(2).replace('.', ',')} h
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardStyle}>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.15em] text-slate-600">Analyse journalière</div>
            <div className="text-xs font-semibold text-slate-500">Une ligne par jour, avec CA, S/C, coût cuisine et coût salle.</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-separate border-spacing-0">
            <thead className="bg-slate-50">
              <tr>
                <th className={headerCell}>Jour</th>
                <th className={headerCell}>CA total</th>
                <th className={headerCell}>CA resto</th>
                <th className={headerCell}>Couverts</th>
                <th className={headerCell}>TM resto</th>
                <th className={headerCell}>S/C</th>
                <th className={headerCell}>Cuisine €</th>
                <th className={headerCell}>Cuisine %</th>
                <th className={headerCell}>Salle €</th>
                <th className={headerCell}>Salle %</th>
              </tr>
            </thead>
            <tbody>
              {analysis.days.map(day => (
                <tr key={day.day} className="odd:bg-white even:bg-slate-50/60">
                  <td className={bodyCell}>{day.label}</td>
                  <td className={bodyCell}>{euro(day.caTotal)}</td>
                  <td className={bodyCell}>{euro(day.caResto)}</td>
                  <td className={bodyCell}>{integer(day.covers)}</td>
                  <td className={bodyCell}>{euro(day.tmResto)}</td>
                  <td className={`${bodyCell} font-black text-cyan-800`}>{percent(day.scTotal)}</td>
                  <td className={bodyCell}>{euro(day.costCuisine)}</td>
                  <td className={bodyCell}>{percent(day.scCuisine)}</td>
                  <td className={bodyCell}>{euro(day.costSalle)}</td>
                  <td className={bodyCell}>{percent(day.scSalle)}</td>
                </tr>
              ))}
              <tr className="bg-cyan-50">
                <td className={totalCell}>Total fin de mois</td>
                <td className={totalCell}>{euro(analysis.monthTotal.caTotal)}</td>
                <td className={totalCell}>{euro(analysis.monthTotal.caResto)}</td>
                <td className={totalCell}>{integer(analysis.monthTotal.covers)}</td>
                <td className={totalCell}>{euro(analysis.monthTotal.tmResto)}</td>
                <td className={`${totalCell} text-cyan-900`}>{percent(analysis.monthTotal.scTotal)}</td>
                <td className={totalCell}>{euro(analysis.monthTotal.costCuisine)}</td>
                <td className={totalCell}>{percent(analysis.monthTotal.scCuisine)}</td>
                <td className={totalCell}>{euro(analysis.monthTotal.costSalle)}</td>
                <td className={totalCell}>{percent(analysis.monthTotal.scSalle)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
