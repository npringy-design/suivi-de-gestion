type ParsedRecapCaisseImport = {
  pdfDay: number | null;
  pdfMonth: number | null;
  pdfYear: number | null;
  values: Record<number, number>;
  theoriqueValues: Record<string, number>;
  realValues: Record<string, number>;
};

const amountToken = '-?\\d+(?:[\\s.]\\d{3})*[,.]\\d{2}';
const amountRegex = new RegExp(amountToken, 'g');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const labelPattern = (label: string) => label.trim().split(/\s+/).map(escapeRegExp).join('\\s+');

const parseAmount = (value: string) => {
  let cleaned = String(value || '').trim().replace(/\s/g, '');
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
  }
  return Number(cleaned) || 0;
};

const findMetric = (text: string, label: string, code: number) => {
  const pattern = new RegExp(`${labelPattern(label)}\\s+${code}\\s+(\\d+)\\s+(${amountToken})(?:\\s+${amountToken})?`, 'i');
  const match = text.match(pattern);
  return {
    quantity: match?.[1] ? Number(match[1]) || 0 : 0,
    amount: match?.[2] ? parseAmount(match[2]) : 0,
  };
};

const findTotalAfterLabel = (text: string, label: string) => {
  const pattern = new RegExp(`${labelPattern(label)}\\s+(${amountToken})`, 'i');
  const match = text.match(pattern);
  return match?.[1] ? parseAmount(match[1]) : 0;
};

export const parseRecapPeriodeCaisse = (
  sourceText: string,
  normalizeImportText: (value: string) => string,
): ParsedRecapCaisseImport | null => {
  const rawText = sourceText.replace(/\u00a0/g, ' ').replace(/€/g, '');
  const normalized = normalizeImportText(rawText);
  if (!normalized.includes('RECAP PERIODE') || !normalized.includes('CA PERIODE JOURNEE')) return null;

  const flatText = rawText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');

  const periodMatch = rawText.match(/P[ée]riode\s+du\s+(\d{2})\/(\d{2})\/(\d{4})/i)
    || rawText.match(/periode\s+du\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const pdfDay = periodMatch ? Number(periodMatch[1]) : null;
  const pdfMonth = periodMatch ? Number(periodMatch[2]) - 1 : null;
  const pdfYear = periodMatch ? Number(periodMatch[3]) : null;

  const taxTotalMatch = flatText.match(new RegExp(`Total\\s+(${amountToken})\\s+(${amountToken})\\s+(${amountToken})\\s+(${amountToken})`, 'i'));
  const totalHt = taxTotalMatch?.[1] ? parseAmount(taxTotalMatch[1]) : 0;
  const totalTtcNet = findTotalAfterLabel(flatText, 'TOTAL CA TTC NET') || (taxTotalMatch?.[3] ? parseAmount(taxTotalMatch[3]) : 0);
  const totalReglementsMatch = flatText.match(new RegExp(`REGLEMENTS[\\s\\S]*?Total\\s+\\d+\\s+(${amountToken})`, 'i'));
  const totalReglements = totalReglementsMatch?.[1] ? parseAmount(totalReglementsMatch[1]) : totalTtcNet;

  const midi = findMetric(flatText, 'COUVERT MIDI', 438);
  const soir = findMetric(flatText, 'COUVERT SOIR', 440);
  const paxMidi = findMetric(flatText, 'PAX MIDI', 444);
  const paxSoir = findMetric(flatText, 'PAX SOIR', 446);
  const vaeSource = findMetric(flatText, 'LIMO & WEB', 26);
  const vaeFallback = findMetric(flatText, 'LIMO & WEB', 452);
  const caLimoWeb = findMetric(flatText, 'CA LIMO & WEB', 79);

  const caVae = vaeSource.amount || vaeFallback.amount || caLimoWeb.amount;
  const caLimonade = paxMidi.amount + paxSoir.amount;
  const nbLimonade = paxMidi.quantity + paxSoir.quantity;

  if (!midi.amount && !soir.amount && !caVae && !caLimonade) {
    throw new Error("La feuille de caisse Recap periode n'a pas pu etre lue automatiquement.");
  }

  const especesPayment = findMetric(flatText, 'ESPECES', 1).amount;
  const ancvPayment = findMetric(flatText, 'ANCV', 6).amount;
  const trEdenred = findMetric(flatText, 'TR EDENRED', 11).amount;
  const sundayPayment = findMetric(flatText, 'SUNDAY', 21).amount + findMetric(flatText, 'TPE SUNDAY', 35).amount;
  const uberPayment = findMetric(flatText, 'UBEREATS WEB', 33).amount;

  return {
    pdfDay,
    pdfMonth,
    pdfYear,
    values: {
      17: caVae,
      18: midi.amount,
      19: soir.amount,
      20: caLimonade,
      25: midi.quantity,
      27: soir.quantity,
      34: nbLimonade,
    },
    theoriqueValues: {
      total_ca: totalReglements || totalTtcNet || totalHt,
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
