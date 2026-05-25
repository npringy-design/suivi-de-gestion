export type CaisseTvaTotals = {
  ttc_5_5: number;
  ttc_10: number;
  ttc_20: number;
};

const emptyTotals: CaisseTvaTotals = {
  ttc_5_5: 0,
  ttc_10: 0,
  ttc_20: 0,
};

const parseFrenchAmount = (value: string) => {
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const AMOUNT = '(-?\\d[\\d\\s]*,\\d{1,2})';

const readTtcForRate = (block: string, rate: '5,5' | '10' | '20') => {
  const ratePattern = rate === '5,5' ? '5[,\\.]5' : rate;
  const rowPattern = new RegExp(`TVA\\s*${ratePattern}\\s*%\\s+${AMOUNT}\\s+${AMOUNT}\\s+${AMOUNT}`, 'i');
  const match = block.match(rowPattern);
  return match?.[3] ? parseFrenchAmount(match[3]) : 0;
};

export const parseCaisseTvaTotals = (sourceText: string): CaisseTvaTotals => {
  const cleaned = sourceText
    .replace(/\u00a0/g, ' ')
    .replace(/€/g, ' ')
    .replace(/\r/g, '\n');

  const normalized = cleaned.replace(/[ \t]+/g, ' ');
  const blocks = Array.from(normalized.matchAll(/TVA\s+TOTAL\s+HT\s+TVA\s+TTC([\s\S]*?)(?=TVA\s+MIDI|REMISES|Sessions\s+avec|OBSERVATION|Du\s+\d{2}\/\d{2}\/\d{2}|$)/gi));

  for (const match of blocks) {
    const block = match[1] || '';
    const totals = {
      ttc_5_5: readTtcForRate(block, '5,5'),
      ttc_10: readTtcForRate(block, '10'),
      ttc_20: readTtcForRate(block, '20'),
    };

    if (totals.ttc_5_5 || totals.ttc_10 || totals.ttc_20) {
      return totals;
    }
  }

  return emptyTotals;
};
