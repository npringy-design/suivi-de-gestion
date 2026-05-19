import type { Plugin } from 'vite';

const insertRequired = (code: string, anchor: string, insertion: string, label: string) => {
  if (!code.includes(anchor)) throw new Error('Patch import caisse recap periode non applique : ' + label);
  return code.replace(anchor, anchor + insertion);
};

const recapPeriodeParser = `
    const recapRawText = sourceText.replace(/\\u00a0/g, ' ').replace(/€/g, '');
    const recapNormalized = normalizeImportText(recapRawText);
    if (/RECAP\\s+PERIODE/.test(recapNormalized) && /CA\\s+PERIODE\\s+JOURNEE/.test(recapNormalized)) {
      const recapLines = recapRawText
        .split(/\\r?\\n/)
        .map(line => line.replace(/\\s+/g, ' ').trim())
        .filter(Boolean);
      const amountToken = '-?\\\\d+(?:[\\\\s.]\\\\d{3})*(?:[,.]\\\\d{2})';
      const amountRegex = new RegExp(amountToken, 'g');
      const parseRecapNumber = (value: string) => Number(value.replace(/\\s/g, '').replace(',', '.')) || 0;
      const amountsInLine = (line: string) => (line.match(amountRegex) || []).map(parseRecapNumber);
      const escapeRecapLabel = (value: string) => value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const findRecapMetric = (label: string, code: number) => {
        const labelPattern = escapeRecapLabel(label).replace(/\\s+/g, '\\\\s+');
        const pattern = new RegExp('^' + labelPattern + '\\\\s+' + code + '\\\\s+(\\\\d+)\\\\s+(' + amountToken + ')(?:\\\\s+' + amountToken + ')?\\\\s*$', 'i');
        const line = recapLines.find(candidate => pattern.test(candidate));
        const match = line?.match(pattern);
        return {
          quantity: match?.[1] ? Number(match[1]) || 0 : 0,
          amount: match?.[2] ? parseRecapNumber(match[2]) : 0,
        };
      };
      const findRecapAmountByLabel = (label: string) => {
        const normalizedLabel = normalizeImportText(label);
        const line = recapLines.find(candidate => normalizeImportText(candidate).startsWith(normalizedLabel));
        const amounts = line ? amountsInLine(line) : [];
        return amounts[amounts.length - 1] || 0;
      };
      const findPaymentAmount = (label: string, code: number) => {
        const normalizedLabel = normalizeImportText(label);
        const line = recapLines.find(candidate => normalizeImportText(candidate).startsWith(normalizedLabel) && new RegExp('\\\\b' + code + '\\\\b').test(candidate));
        const amounts = line ? amountsInLine(line) : [];
        return amounts[amounts.length - 1] || 0;
      };
      const periodMatch = recapRawText.match(/P[ée]riode\\s+du\\s+(\\d{2})\\/(\\d{2})\\/(\\d{4})/i)
        || recapRawText.match(/periode\\s+du\\s+(\\d{2})\\/(\\d{2})\\/(\\d{4})/i);
      const pdfDay = periodMatch ? Number(periodMatch[1]) : null;
      const pdfMonth = periodMatch ? Number(periodMatch[2]) - 1 : null;
      const pdfYear = periodMatch ? Number(periodMatch[3]) : null;
      const caTaxTotalLine = recapLines.find(line => /^Total\\s+/i.test(line) && amountsInLine(line).length >= 4);
      const caTaxAmounts = caTaxTotalLine ? amountsInLine(caTaxTotalLine) : [];
      const totalHt = caTaxAmounts[0] || 0;
      const totalTtcFromTaxes = caTaxAmounts[2] || caTaxAmounts[caTaxAmounts.length - 1] || 0;
      const totalTtcNet = findRecapAmountByLabel('TOTAL CA TTC NET') || totalTtcFromTaxes;
      const htRatio = totalHt > 0 && totalTtcNet > 0 ? totalHt / totalTtcNet : 1;
      const toHt = (value: number) => Math.round(value * htRatio * 100) / 100;

      const midi = findRecapMetric('COUVERT MIDI', 438);
      const soir = findRecapMetric('COUVERT SOIR', 440);
      const paxMidi = findRecapMetric('PAX MIDI', 444);
      const paxSoir = findRecapMetric('PAX SOIR', 446);
      const limoWeb452 = findRecapMetric('LIMO & WEB', 452);
      const limoWeb26 = findRecapMetric('LIMO & WEB', 26);
      const caLimoWeb79 = findRecapMetric('CA LIMO & WEB', 79);
      const limoWebTtc = limoWeb452.amount || limoWeb26.amount || caLimoWeb79.amount || paxMidi.amount + paxSoir.amount;

      const caMidi = toHt(midi.amount);
      const caSoir = toHt(soir.amount);
      const caVae = toHt(limoWebTtc);
      const paxQuantity = paxMidi.quantity + paxSoir.quantity;
      const totalCalculated = caMidi + caSoir + caVae;

      if (!totalCalculated || (!caMidi && !caSoir && !caVae)) {
        throw new Error("La feuille de caisse Récap période n'a pas pu être lue automatiquement.");
      }

      const sundayPayment = findPaymentAmount('SUNDAY', 21) + findPaymentAmount('TPE SUNDAY', 35);
      const trEdenred = findPaymentAmount('TR EDENRED', 11);
      const ancvPayment = findPaymentAmount('ANCV', 6);
      const especesPayment = findPaymentAmount('ESPECES', 1);
      const uberPayment = findPaymentAmount('UBEREATS WEB', 33);

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
          34: paxQuantity,
        } as Record<number, number>,
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
    }
`;

export const dashboardCaisseRecapPeriodePatch = (): Plugin => ({
  name: 'dashboard-caisse-recap-periode-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    return {
      code: insertRequired(
        code,
        '  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {\n',
        recapPeriodeParser,
        'parser recap periode'
      ),
      map: null,
    };
  },
});
