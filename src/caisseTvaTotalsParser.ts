export type CaisseTvaTotals = {
  ttc_5_5: number;
  ttc_10: number;
  ttc_20: number;
};

const parseFrenchAmount = (value: string) => {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyTotals = (): CaisseTvaTotals => ({
  ttc_5_5: 0,
  ttc_10: 0,
  ttc_20: 0,
});

const readNumbers = (value: string) => (value.match(/-?\d[\d\s]*,\d{1,2}/g) || []).map(parseFrenchAmount);
const readRates = (value: string) => Array.from(value.matchAll(/TVA\s*(5[,\.]5|10|20)\s*%/gi)).map(match => ({
  rate: match[1].replace('.', ',') as '5,5' | '10' | '20',
  index: match.index || 0,
  end: (match.index || 0) + match[0].length,
}));

const keyForRate = (rate: '5,5' | '10' | '20'): keyof CaisseTvaTotals => {
  if (rate === '5,5') return 'ttc_5_5';
  if (rate === '10') return 'ttc_10';
  return 'ttc_20';
};

const parseTableBlock = (block: string): CaisseTvaTotals => {
  const totals = emptyTotals();
  const rates = readRates(block);
  if (rates.length === 0) return totals;

  rates.forEach((rateInfo, index) => {
    const nextRate = rates[index + 1];
    const rowText = block.slice(rateInfo.end, nextRate?.index ?? rateInfo.end + 180);
    const rowNumbers = readNumbers(rowText);
    if (rowNumbers.length >= 3) {
      totals[keyForRate(rateInfo.rate)] = rowNumbers[2];
    }
  });

  if (totals.ttc_5_5 || totals.ttc_10 || totals.ttc_20) return totals;

  const afterLastRate = block.slice(Math.max(...rates.map(item => item.end)));
  const totalIndex = afterLastRate.search(/\bTOTAL\b/i);
  const numbersArea = totalIndex >= 0 ? afterLastRate.slice(totalIndex) : afterLastRate;
  const numbers = readNumbers(numbersArea);
  const rowCount = rates.length + 1;
  rates.forEach((rateInfo, index) => {
    const value = numbers[(rowCount * 2) + index];
    if (value) totals[keyForRate(rateInfo.rate)] = value;
  });

  return totals;
};

export const parseCaisseTvaTotals = (sourceText: string): CaisseTvaTotals => {
  const text = sourceText
    .replace(/\u00a0/g, ' ')
    .replace(/€/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ');

  const serviceBlock = text.match(/Total\s+service\s+HT\s+TVA\s+TTC([\s\S]*?)(?:REMISES|OBSERVATION|Sessions\s+avec|$)/i)?.[1];
  if (serviceBlock) {
    const fromService = parseTableBlock(serviceBlock);
    if (fromService.ttc_5_5 || fromService.ttc_10 || fromService.ttc_20) return fromService;
  }

  const totalBlock = text.match(/TVA\s+TOTAL\s+HT\s+TVA\s+TTC([\s\S]*?)(?:TVA\s+MIDI|REMISES|OBSERVATION|Sessions\s+avec|$)/i)?.[1];
  if (totalBlock) return parseTableBlock(totalBlock);

  return emptyTotals();
};
