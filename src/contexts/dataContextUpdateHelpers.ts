import type { MonthData } from './DataContext';

export type DailyChannelKey =
  | 'nepting'
  | 'especes'
  | 'conecs'
  | 'sunday'
  | 'uber'
  | 'amexAncv'
  | 'deliveroo'
  | 'clickCollect';

export type DailyChannelValue<K extends DailyChannelKey> = MonthData[K] extends Record<number, infer T>
  ? T
  : never;

export const normalizeMonthData = (monthData?: Partial<MonthData>): MonthData => {
  const existing = monthData || {};

  return {
    ...existing,
    theorique: existing.theorique || {},
    nepting: existing.nepting || {},
    especes: existing.especes || {},
    conecs: existing.conecs || {},
    ancvPapiers: existing.ancvPapiers || {},
    saisieTR: existing.saisieTR || {},
    visuTRPapiers: existing.visuTRPapiers || {},
    sunday: existing.sunday || {},
    uber: existing.uber || {},
    amexAncv: existing.amexAncv || {},
    deliveroo: existing.deliveroo || {},
    clickCollect: existing.clickCollect || {},
    bilanSynthese: existing.bilanSynthese || {},
  };
};

export const updateDailyChannelData = <K extends DailyChannelKey>(
  prev: Record<number, MonthData>,
  month: number,
  day: number,
  channelKey: K,
  defaultDayData: DailyChannelValue<K>,
  field: keyof DailyChannelValue<K>,
  value: string | number,
): Record<number, MonthData> => {
  const monthData = normalizeMonthData(prev[month]);
  const channelData = monthData[channelKey] as Record<number, DailyChannelValue<K>>;
  const dayData = channelData[day] || defaultDayData;
  const nextDayData = {
    ...(dayData as Record<string, unknown>),
    [field]: value,
  } as DailyChannelValue<K>;

  return {
    ...prev,
    [month]: {
      ...monthData,
      [channelKey]: {
        ...channelData,
        [day]: nextDayData,
      },
    },
  };
};

export const updateMonthlyStringRecordData = <K extends 'dashboard' | 'caisseDynamique' | 'edgMensuel' | 'edgMensuelRealise'>(
  prev: Record<number, MonthData>,
  month: number,
  recordKey: K,
  cellKey: string,
  value: string,
): Record<number, MonthData> => {
  const monthData = normalizeMonthData(prev[month]);
  const recordData = monthData[recordKey] || {};

  return {
    ...prev,
    [month]: {
      ...monthData,
      [recordKey]: {
        ...recordData,
        [cellKey]: value,
      },
    },
  };
};

// Fusionne, en une seule mise à jour, les valeurs importées de plusieurs mois dans
// edgMensuel : les clés importées écrasent, les clés absentes de valuesByMonth restent
// intactes (saisie manuelle préservée). Utilisé par l'import automatique du budget EDG.
export const mergeEdgMensuelBudgetData = (
  prev: Record<number, MonthData>,
  valuesByMonth: Record<number, Record<string, string>>,
): Record<number, MonthData> => {
  const next = { ...prev };
  Object.entries(valuesByMonth).forEach(([monthKey, values]) => {
    const month = Number(monthKey);
    const monthData = normalizeMonthData(next[month]);
    next[month] = {
      ...monthData,
      edgMensuel: { ...(monthData.edgMensuel || {}), ...values },
    };
  });
  return next;
};

// Même mécanisme que mergeEdgMensuelBudgetData, mais cible edgMensuelRealise. Utilisé par
// l'import automatique du Réalisé EDG (onglets mensuels V25).
export const mergeEdgMensuelRealiseData = (
  prev: Record<number, MonthData>,
  valuesByMonth: Record<number, Record<string, string>>,
): Record<number, MonthData> => {
  const next = { ...prev };
  Object.entries(valuesByMonth).forEach(([monthKey, values]) => {
    const month = Number(monthKey);
    const monthData = normalizeMonthData(next[month]);
    next[month] = {
      ...monthData,
      edgMensuelRealise: { ...(monthData.edgMensuelRealise || {}), ...values },
    };
  });
  return next;
};
