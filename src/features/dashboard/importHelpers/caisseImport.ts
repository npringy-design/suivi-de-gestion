export const parseCaisseNumber = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.')) || 0;

export const findCaisseAmounts = (text: string, label: string) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}\\s+((?:-?\\d[\\d\\s]*,\\d{2}\\s*){1,3})`, 'i'));
  return match ? extractCaisseNumbers(match[1]) : [];
};
export const findCaisseAmount = (text: string, label: string) => {
  const amounts = findCaisseAmounts(text, label);
  return amounts[amounts.length - 1] || 0;
};
export const findCaisseTheoriqueAmount = (text: string, label: string) => {
  const amounts = findCaisseAmounts(text, label);
  return amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0] || 0;
};
export const extractCaisseNumbers = (text: string) => (text.match(/-?\d[\d\s]*,\d{2}/g) || []).map(parseCaisseNumber);
export const findCaisseTtcByRate = (source: string, rate: '5,5' | '10' | '20') => {
  const text = source.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const headerMatch = text.match(/TVA\s+TOTAL\s+HT\s+TVA\s+TTC/i);
  if (!headerMatch || headerMatch.index === undefined) return 0;
  const block = text.slice(headerMatch.index, headerMatch.index + 450);
  const rateRegex = rate === '5,5' ? /TVA\s*5[,.]5\s*%/i : rate === '10' ? /TVA\s*10\s*%/i : /TVA\s*20\s*%/i;
  const rateMatch = block.match(rateRegex);
  if (!rateMatch || rateMatch.index === undefined) return 0;
  const afterRate = block.slice(rateMatch.index + rateMatch[0].length);
  const nextRow = afterRate.search(/TVA\s*(?:5[,.]5|10|20)\s*%|\bTOTAL\b/i);
  const rowText = nextRow >= 0 ? afterRate.slice(0, nextRow) : afterRate.slice(0, 160);
  const amounts = extractCaisseNumbers(rowText);
  const ht = amounts[2] || amounts[0] || 0;
  const coeff = rate === '5,5' ? 1.055 : rate === '10' ? 1.10 : 1.20;
  return Math.round(ht * coeff * 100) / 100;
};
