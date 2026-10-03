type CostRow = {
  totalCost: number | null;
};

export type PayrollCostEvolution = {
  costTotal: number; // coût salarial cumulé de l'année (mois ayant un coût)
  costMonths: number;
  // Comparaison à périmètre identique : uniquement les mois renseignés des deux années.
  comparableMonths: number;
  comparableCost: number;
  comparableLastYearCost: number;
  vsLastYearDelta: number | null; // € sur les mois comparables
  vsLastYearPct: number | null;
  // Dernier mois renseigné de l'année vs le mois qui le précède (janvier : décembre N-1).
  latestMonth: number | null;
  latestCost: number | null;
  previousCost: number | null;
  vsPreviousDelta: number | null;
  vsPreviousPct: number | null;
};

const pctOf = (delta: number, reference: number): number | null => (reference !== 0 ? (delta / Math.abs(reference)) * 100 : null);

export type PayrollComparableTotals = {
  months: number;
  current: number | null;
  lastYear: number | null;
  delta: number | null;
  pct: number | null;
};

// Mois renseignés des deux années uniquement. 'sum' pour un montant (coût), 'mean' pour un effectif (ETP : une somme n'a pas de sens).
export const computeComparableTotals = (
  values: Array<number | null>,
  lastYearValues: Array<number | null>,
  aggregate: 'sum' | 'mean',
): PayrollComparableTotals => {
  let months = 0;
  let current = 0;
  let lastYear = 0;
  values.forEach((value, index) => {
    const previous = lastYearValues[index] ?? null;
    if (value === null || previous === null) return;
    months += 1;
    current += value;
    lastYear += previous;
  });
  if (months === 0) return { months, current: null, lastYear: null, delta: null, pct: null };
  const divisor = aggregate === 'mean' ? months : 1;
  const delta = (current - lastYear) / divisor;
  return { months, current: current / divisor, lastYear: lastYear / divisor, delta, pct: pctOf(delta, lastYear / divisor) };
};

// rows / lastYearRows : 12 lignes (janvier → décembre) de l'année affichée et de l'année précédente.
export const computeCostEvolution = (rows: CostRow[], lastYearRows: CostRow[]): PayrollCostEvolution => {
  const withCost = rows.filter(row => row.totalCost !== null);

  let comparableMonths = 0;
  let comparableCost = 0;
  let comparableLastYearCost = 0;
  rows.forEach((row, index) => {
    const previousYear = lastYearRows[index]?.totalCost ?? null;
    if (row.totalCost !== null && previousYear !== null) {
      comparableMonths += 1;
      comparableCost += row.totalCost;
      comparableLastYearCost += previousYear;
    }
  });

  let latestMonth: number | null = null;
  rows.forEach((row, index) => {
    if (row.totalCost !== null) latestMonth = index;
  });
  const latestCost = latestMonth === null ? null : rows[latestMonth].totalCost;
  const previousCost = latestMonth === null ? null : latestMonth === 0 ? lastYearRows[11]?.totalCost ?? null : rows[latestMonth - 1].totalCost;
  const vsPreviousDelta = latestCost !== null && previousCost !== null ? latestCost - previousCost : null;
  const vsLastYearDelta = comparableMonths > 0 ? comparableCost - comparableLastYearCost : null;

  return {
    costTotal: withCost.reduce((total, row) => total + (row.totalCost ?? 0), 0),
    costMonths: withCost.length,
    comparableMonths,
    comparableCost,
    comparableLastYearCost,
    vsLastYearDelta,
    vsLastYearPct: vsLastYearDelta === null ? null : pctOf(vsLastYearDelta, comparableLastYearCost),
    latestMonth,
    latestCost,
    previousCost,
    vsPreviousDelta,
    vsPreviousPct: vsPreviousDelta === null || previousCost === null ? null : pctOf(vsPreviousDelta, previousCost),
  };
};
