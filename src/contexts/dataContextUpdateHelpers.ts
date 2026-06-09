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

export const updateMonthlyStringRecordData = <K extends 'dashboard' | 'edgMensuel' | 'edgMensuelRealise' | 'edgMensuelN1'>(
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
