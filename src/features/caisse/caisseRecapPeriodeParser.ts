type ParsedRecapCaisseImport = {
  pdfDay: number | null;
  pdfMonth: number | null;
  pdfYear: number | null;
  values: Record<number, number>;
  theoriqueValues: Record<string, number>;
  realValues: Record<string, number>;
};

const amountToken = '-?\\d+(?:[\\s.]\\d{3})*[,.]\\d{2}';

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

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const findMetric = (text: string, label: string, code: number) => {
  const pattern = new RegExp(`${labelPattern(label)}\\s+${code}\\s+(\\d+)\\s+(${amountToken})(?:\\s+${amountToken})?`, 'i');
  const match = text.match(pattern);
  return {
    quantity: match?.[1] ? Number(match[1]) || 0 : 0,
    amount: match?.[2] ? parseAmount(match[2]) : 0,
  };
};

const findPaymentAmount = (lines: string[], flatText: string, label: string, code?: number) => {
  const codePart = typeof code === 'number' ? `${code}` : '\\d+';
  const linePattern = new RegExp(`^${labelPattern(label)}\\s+${codePart}(?:\\s+\\d+)?\\s+(${amountToken})(?:\\s+${amountToken})?`, 'i');
  const lineTotal = lines.reduce((sum, line) => {
    const match = line.match(linePattern);
    return sum + (match?.[1] ? parseAmount(match[1]) : 0);
  }, 0);
  if (lineTotal > 0) return lineTotal;

  const flatPattern = new RegExp(`(?:^|\\s)${labelPattern(label)}\\s+${codePart}(?:\\s+\\d+)?\\s+(${amountToken})(?:\\s+${amountToken})?`, 'gi');
  let total = 0;
  let match: RegExpExecArray | null;
  const seen = new Set<number>();
  while ((match = flatPattern.exec(flatText)) !== null) {
    if (seen.has(match.index)) continue;
    seen.add(match.index);
    total += match?.[1] ? parseAmount(match[1]) : 0;
  }
  return total;
};

const sumPaymentAmounts = (
  lines: string[],
  flatText: string,
  labels: Array<string | { label: string; code?: number }>,
) => labels.reduce((sum, entry) => {
  const label = typeof entry === 'string' ? entry : entry.label;
  const code = typeof entry === 'string' ? undefined : entry.code;
  return sum + findPaymentAmount(lines, flatText, label, code);
}, 0);

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

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const flatText = lines.join(' ');

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
  const repriseAcompte = findMetric(flatText, 'REPRISE ACOMPTES', 428);
  const repriseAcompteSingular = findMetric(flatText, 'REPRISE ACOMPTE', 428);

  const caVae = repriseAcompte.amount || repriseAcompteSingular.amount;
  const caMidiRestaurant = midi.amount;
  const caSoirRestaurant = roundMoney(Math.max(0, soir.amount - caVae));
  const caLimonadeMidi = paxMidi.amount;
  const caLimonadeSoir = paxSoir.amount;
  const caLimonade = roundMoney(caLimonadeMidi + caLimonadeSoir);
  const nbLimonadeMidi = paxMidi.quantity;
  const nbLimonadeSoir = paxSoir.quantity;
  const nbLimonade = nbLimonadeMidi + nbLimonadeSoir;

  if (!caMidiRestaurant && !caSoirRestaurant && !caVae && !caLimonade) {
    throw new Error("La feuille de caisse Recap periode n'a pas pu etre lue automatiquement.");
  }

  const especesPayment = findMetric(flatText, 'ESPECES', 1).amount;
  const ancvPayment = findMetric(flatText, 'ANCV', 6).amount;
  const carteBleuePayment = sumPaymentAmounts(lines, flatText, [
    'CARTE BLEUE',
    'CARTE BANCAIRE',
    'CB',
    { label: 'TPE SUNDAY', code: 35 },
    'SUNDAY TPE',
  ]);
  const sundayPayment = sumPaymentAmounts(lines, flatText, [
    { label: 'SUNDAY', code: 21 },
    'SUNDAY MANUEL',
    'CHEQUE BANCAIRE',
  ]);
  const trPapierPayment = sumPaymentAmounts(lines, flatText, [
    'TR EDENRED',
    'TR UP',
    'TR BIMPLI',
    'TR PLUXEE',
    'EDENRED TR',
    'UP TR',
    'BIMPLI TR',
    'PLUXEE TR',
    'EDENRED TR PAPIER',
    'UP TR PAPIER',
    'BIMPLI TR PAPIER',
    'PLUXEE TR PAPIER',
    'TR PAPIER',
  ]);
  const trCartePayment = sumPaymentAmounts(lines, flatText, [
    'CARTE TR',
    'TR CARTE',
    'CARTE EDENRED',
    'CARTE UP',
    'CARTE BIMPLI',
    'CARTE PLUXEE',
    'EDENRED CARTE',
    'UP CARTE',
    'BIMPLI CARTE',
    'PLUXEE CARTE',
  ]);
  const uberPayment = findMetric(flatText, 'UBEREATS WEB', 33).amount;
  const deliverooPayment = sumPaymentAmounts(lines, flatText, [
    { label: 'DELIVEROO WEB', code: 32 },
    'DELIVEROO',
  ]);

  return {
    pdfDay,
    pdfMonth,
    pdfYear,
    values: {
      17: caVae,
      18: caMidiRestaurant,
      19: caSoirRestaurant,
      20: caLimonade,
      25: midi.quantity,
      27: soir.quantity,
      34: nbLimonade,
      110: caLimonadeMidi,
      111: caLimonadeSoir,
      112: nbLimonadeMidi,
      114: nbLimonadeSoir,
    },
    theoriqueValues: {
      total_ca: totalReglements || totalTtcNet || totalHt,
      cb: carteBleuePayment,
      amex: 0,
      tr_papier: trPapierPayment,
      tr_carte: trCartePayment,
      ancv: ancvPayment,
      especes: especesPayment,
      click_collect: 0,
      uber: uberPayment,
      deliveroo: deliverooPayment,
      sunday: sundayPayment,
    },
    realValues: {
      cb: carteBleuePayment,
      pourboires: 0,
      especes: especesPayment,
      pieces: 0,
      amexAncvCarte: 0,
      trCarte: trCartePayment,
      ancvPapier: ancvPayment,
      trPapier: trPapierPayment,
      sunday: sundayPayment,
      uber: uberPayment,
      deliveroo: deliverooPayment,
      clickCollect: 0,
    },
  };
};
