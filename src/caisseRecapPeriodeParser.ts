type ParsedRecapCaisseImport = {
  pdfDay: number | null;
  pdfMonth: number | null;
  pdfYear: number | null;
  values: Record<number, number>;
  theoriqueValues: Record<string, number>;
  realValues: Record<string, number>;
};

const amountRegex = /-?\d+(?:[\s.]\d{3})*[,.]\d{2}/g;

const parseAmount = (value: string) => Number(String(value || '').replace(/\s/g, '').replace(',', '.')) || 0;
const amountsInLine = (line: string) => (line.match(amountRegex) || []).map(parseAmount);

const parseMetricAfterCode = (line: string, code: number) => {
  if (!line) return { quantity: 0, amount: 0 };
  const codeMatch = line.match(new RegExp('\\b' + code + '\\b'));
  const afterCode = codeMatch ? line.slice((codeMatch.index || 0) + codeMatch[0].length).trim() : line;
  const quantityMatch = afterCode.match(/\b\d+\b/);
  const amounts = amountsInLine(afterCode);
  return {
    quantity: quantityMatch ? Number(quantityMatch[0]) || 0 : 0,
    amount: amounts[0] || 0,
  };
};

export const parseRecapPeriodeCaisse = (
  sourceText: string,
  normalizeImportText: (value: string) => string,
): ParsedRecapCaisseImport | null => {
  const rawText = sourceText.replace(/\u00a0/g, ' ').replace(/€/g, '');
  const normalized = normalizeImportText(rawText);
  if (!normalized.includes('RECAP PERIODE') || !normalized.includes('CA PERIODE JOURNEE')) return null;

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const findLine = (label: string, code: number) => {
    const normalizedLabel = normalizeImportText(label);
    return lines.find(candidate => {
      const normalizedCandidate = normalizeImportText(candidate);
      return normalizedCandidate.includes(normalizedLabel) && new RegExp('\\b' + code + '\\b').test(candidate);
    }) || '';
  };

  const findMetric = (label: string, code: number) => parseMetricAfterCode(findLine(label, code), code);
  const findAmountByLabel = (label: string) => {
    const normalizedLabel = normalizeImportText(label);
    const line = lines.find(candidate => normalizeImportText(candidate).startsWith(normalizedLabel));
    const amounts = line ? amountsInLine(line) : [];
    return amounts[amounts.length - 1] || 0;
  };
  const findPayment = (label: string, code: number) => {
    const amounts = amountsInLine(findLine(label, code));
    return amounts[0] || 0;
  };

  const periodMatch = rawText.match(/P[ée]riode\s+du\s+(\d{2})\/(\d{2})\/(\d{4})/i)
    || rawText.match(/periode\s+du\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const pdfDay = periodMatch ? Number(periodMatch[1]) : null;
  const pdfMonth = periodMatch ? Number(periodMatch[2]) - 1 : null;
  const pdfYear = periodMatch ? Number(periodMatch[3]) : null;

  const totalTaxLine = lines.find(line => /^Total\s+/i.test(line) && amountsInLine(line).length >= 3);
  const totalTaxAmounts = totalTaxLine ? amountsInLine(totalTaxLine) : [];
  const totalHt = totalTaxAmounts[0] || 0;
  const totalTtcFromTaxTable = totalTaxAmounts[2] || totalTaxAmounts[totalTaxAmounts.length - 1] || 0;
  const totalTtcNet = findAmountByLabel('TOTAL CA TTC NET') || totalTtcFromTaxTable;
  const htRatio = totalHt > 0 && totalTtcNet > 0 ? totalHt / totalTtcNet : 1;
  const toHt = (value: number) => Math.round(value * htRatio * 100) / 100;

  const midi = findMetric('COUVERT MIDI', 438);
  const soir = findMetric('COUVERT SOIR', 440);
  const paxMidi = findMetric('PAX MIDI', 444);
  const paxSoir = findMetric('PAX SOIR', 446);
  const limoWeb452 = findMetric('LIMO & WEB', 452);
  const limoWeb26 = findMetric('LIMO & WEB', 26);
  const caLimoWeb79 = findMetric('CA LIMO & WEB', 79);
  const paxLimoWebTtc = paxMidi.amount + paxSoir.amount;
  const limoWebTtc = paxLimoWebTtc || limoWeb452.amount || limoWeb26.amount || caLimoWeb79.amount;

  const caMidi = toHt(midi.amount);
  const caSoir = toHt(soir.amount);
  const caVae = toHt(limoWebTtc);

  if (!caMidi && !caSoir && !caVae) {
    throw new Error("La feuille de caisse Recap periode n'a pas pu etre lue automatiquement.");
  }

  const sundayPayment = findPayment('SUNDAY', 21) + findPayment('TPE SUNDAY', 35);
  const trEdenred = findPayment('TR EDENRED', 11);
  const ancvPayment = findPayment('ANCV', 6);
  const especesPayment = findPayment('ESPECES', 1);
  const uberPayment = findPayment('UBEREATS WEB', 33);

  return {
    pdfDay,
    pdfMonth,
    pdfYear,
    values: {
      17: caVae,
      18: caMidi,
      19: caSoir,
      20: 0,
      25: midi.quantity,
      27: soir.quantity,
      34: paxMidi.quantity + paxSoir.quantity,
    },
    theoriqueValues: {
      total_ca: totalTtcNet,
      cb: 0,
      amex: 0,
      tr_papier: 0,
      tr_carte: trEdenred,
      ancv: ancvPayment,
      especes: especesPayment,
      click_collect: 0,
      uber: uberPayment,
      deliveroo: 0,
      sunday: sundayPayment,
    },
    realValues: {
      cb: 0,
      pourboires: 0,
      especes: especesPayment,
      pieces: 0,
      amexAncvCarte: 0,
      trCarte: trEdenred,
      ancvPapier: ancvPayment,
      trPapier: 0,
      sunday: sundayPayment,
      uber: uberPayment,
      deliveroo: 0,
      clickCollect: 0,
    },
  };
};
