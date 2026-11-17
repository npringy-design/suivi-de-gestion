import { parseMoneyValue } from '@/lib/money';
import type { DashboardColumn, DashboardRow } from '@/features/dashboard/dashboardTypes';

// Bloc « Résultats mensuels » du Suivi quotidien : lit uniquement les colonnes déjà calculées par
// computeDashboardData (ligne month_total) et les saisies du bloc (stock final).
export type MonthlyResultsInput = {
  calculatedData: Record<string, string>;
  cellData: Record<string, string>;
  rows: DashboardRow[];
  dynamicColumns: DashboardColumn[];
  caN1: number | null;
  previousStockFinal: string | undefined;
  objectifFoodCost: number | undefined;
  hasLimonade: boolean;
};

const DASH = '—';
const f = (n: number, dec = 2) => n.toFixed(dec).replace('.', ',');
const eur = (n: number) => `${f(n)} €`;

export function computeMonthlyResults({
  calculatedData, cellData, rows, dynamicColumns, caN1, previousStockFinal, objectifFoodCost, hasLimonade,
}: MonthlyResultsInput): Record<string, string> {
  const mtIdx = rows.findIndex(r => r.type === 'month_total');
  const mt = (col: number) => parseMoneyValue(calculatedData[`${mtIdx}-${col}`]);
  const dayIdx = rows.map((r, i) => (r.type === 'day' ? i : -1)).filter(i => i >= 0);
  const daysWith = (col: number) => dayIdx.filter(i => parseMoneyValue(calculatedData[`${i}-${col}`]) > 0).length;
  const fg = (b: number, g: number) => parseMoneyValue(calculatedData[`fg-total-${b}-${g}`]);

  const caR = mt(21);
  const caBudget = mt(3);
  const cvtsResto = mt(29);
  const caResto = mt(18) + mt(19);
  const cvtsLimo = mt(34);
  const caLimo = mt(20);
  const joursResto = daysWith(29);
  const joursLimo = daysWith(34);

  const hasStockInit = previousStockFinal !== undefined && previousStockFinal.trim() !== '';
  const stockInit = hasStockInit ? parseMoneyValue(previousStockFinal) : 0;
  const hasStockFinal = (cellData['rm_stock_final'] ?? '').trim() !== '';
  const stockFinal = parseMoneyValue(cellData['rm_stock_final']);
  const varStock = stockFinal - stockInit;

  const achatTotal = mt(58);
  const metroCol = dynamicColumns.findIndex((c, i) => i >= 45 && i <= 57 && String(c[2] ?? '').toUpperCase().includes('METRO'));
  const achatHorsMetro = metroCol >= 0 ? achatTotal - mt(metroCol) : null;

  const consoReel = stockInit + achatTotal - stockFinal;
  const ratioReel = caR > 0 ? (consoReel / caR) * 100 : 0;
  const hasObjectif = typeof objectifFoodCost === 'number' && Number.isFinite(objectifFoodCost) && objectifFoodCost > 0;
  const consoObj = hasObjectif ? caR * (objectifFoodCost / 100) : 0;

  const nbHBudget = mt(61);
  const coutProj = mt(72);
  const nbHReel = mt(76);
  const coutReel = mt(87);

  return {
    ca_realise: eur(caR),
    ca_budget: eur(caBudget),
    var_n1: caN1 !== null && caN1 > 0 ? `${f((caR / caN1 - 1) * 100)}%` : DASH,
    diff_n1: caN1 !== null ? eur(caR - caN1) : DASH,
    diff_budget: eur(caR - caBudget),
    cvts_resto: cvtsResto.toFixed(0),
    moy_cvts_resto: joursResto > 0 ? (cvtsResto / joursResto).toFixed(0) : '0',
    tm_resto: cvtsResto > 0 ? eur(caResto / cvtsResto) : '',
    cvts_limo: hasLimonade ? cvtsLimo.toFixed(0) : DASH,
    moy_cvts_limo: hasLimonade ? (joursLimo > 0 ? (cvtsLimo / joursLimo).toFixed(0) : '0') : DASH,
    tm_limo: hasLimonade ? (cvtsLimo > 0 ? eur(caLimo / cvtsLimo) : '') : DASH,
    rm_stock_init: hasStockInit ? eur(stockInit) : '',
    rm_stock_final: hasStockFinal ? eur(stockFinal) : '',
    var_stock: hasStockInit && hasStockFinal ? f(varStock, 0) : '',
    rm_achat_hm: achatHorsMetro !== null ? eur(achatHorsMetro) : DASH,
    rm_achat_total: eur(achatTotal),
    ratio_obj: hasObjectif ? `${f(objectifFoodCost)}%` : DASH,
    conso_obj: hasObjectif ? eur(consoObj) : DASH,
    ratio_reel: `${f(ratioReel)}%`,
    marge_reel: eur(caR - consoReel),
    conso_reel: eur(consoReel),
    ecart_ratio: hasObjectif ? f(ratioReel - objectifFoodCost) : DASH,
    ecart_conso: hasObjectif ? f(consoReel - consoObj, 0) : DASH,
    nb_h_budget: nbHBudget ? f(nbHBudget) : '',
    sc_obj: caBudget > 0 ? `${f((coutProj / caBudget) * 100)}%` : '',
    prod_budget: nbHBudget > 0 ? f(caBudget / nbHBudget) : '',
    nb_h_reel: nbHReel ? f(nbHReel) : '',
    ecart_h: f(nbHReel - nbHBudget),
    sc_reel: caR > 0 ? `${f((coutReel / caR) * 100)}%` : '',
    ecart_sc: caR > 0 ? `${f(((coutReel - coutProj) / caR) * 100)}%` : '',
    prod_reel: nbHReel > 0 ? f(caR / nbHReel) : '',
    fg_0: eur(fg(0, 0)), fg_1: eur(fg(1, 0)), fg_2: eur(fg(2, 0)),
    fg_3: eur(fg(3, 0)), fg_4: eur(fg(0, 1)), fg_5: eur(fg(0, 2)),
    fg_6: eur(fg(1, 1)), fg_7: eur(fg(2, 1)), fg_8: eur(fg(2, 2)),
    fg_9: eur(fg(3, 1)), fg_10: eur(fg(1, 2)), fg_11: eur(fg(3, 2)),
  };
}
