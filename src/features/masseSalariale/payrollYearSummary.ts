type SummaryRow = {
  totalCost: number | null;
  revenue: number | null;
};

export type PayrollYearSummary = {
  revenueTotal: number; // CA réalisé cumulé (mois ayant un CA)
  revenueMonths: number;
  costTotal: number; // coût salarial cumulé (mois ayant un coût)
  costMonths: number;
  ratioPct: number | null; // coût / CA, sur les seuls mois ayant coût ET CA
  comparableMonths: number;
  ratioDeltaVsLastYearPt: number | null; // même périmètre de mois, année précédente
  monthsOverThreshold: number;
};

const isComparable = (row: SummaryRow | undefined): row is { totalCost: number; revenue: number } =>
  row !== undefined && row.totalCost !== null && row.revenue !== null && row.revenue > 0;

const ratioOf = (rows: Array<{ totalCost: number; revenue: number }>): number | null => {
  const cost = rows.reduce((total, row) => total + row.totalCost, 0);
  const revenue = rows.reduce((total, row) => total + row.revenue, 0);
  return revenue > 0 ? (cost / revenue) * 100 : null;
};

// rows / lastYearRows : 12 lignes (janvier → décembre) de l'année et de l'année précédente.
export const computeYearSummary = (
  rows: SummaryRow[],
  lastYearRows: SummaryRow[],
  thresholdPct: number,
): PayrollYearSummary => {
  const withRevenue = rows.filter(row => row.revenue !== null && row.revenue > 0);
  const withCost = rows.filter(row => row.totalCost !== null);
  const comparable = rows.filter(isComparable);

  // Variation vs N-1 mesurée sur les mêmes mois, pour ne pas comparer des périmètres différents.
  const sharedCurrent: Array<{ totalCost: number; revenue: number }> = [];
  const sharedLastYear: Array<{ totalCost: number; revenue: number }> = [];
  rows.forEach((row, index) => {
    const previous = lastYearRows[index];
    if (isComparable(row) && isComparable(previous)) {
      sharedCurrent.push(row);
      sharedLastYear.push(previous);
    }
  });
  const currentRatio = ratioOf(sharedCurrent);
  const lastYearRatio = ratioOf(sharedLastYear);

  return {
    revenueTotal: withRevenue.reduce((total, row) => total + (row.revenue ?? 0), 0),
    revenueMonths: withRevenue.length,
    costTotal: withCost.reduce((total, row) => total + (row.totalCost ?? 0), 0),
    costMonths: withCost.length,
    ratioPct: ratioOf(comparable),
    comparableMonths: comparable.length,
    ratioDeltaVsLastYearPt: currentRatio !== null && lastYearRatio !== null ? currentRatio - lastYearRatio : null,
    monthsOverThreshold: comparable.filter(row => (row.totalCost / row.revenue) * 100 > thresholdPct).length,
  };
};
