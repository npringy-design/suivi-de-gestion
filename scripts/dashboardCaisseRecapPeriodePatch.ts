import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch import caisse recap periode non applique : ' + label);
  return code.replace(from, to);
};

const appendBilanUpdate = `
    const bilanValues = (parsed as ParsedCaisseImport & { bilanValues?: { ttc_5_5?: number; ttc_10?: number; ttc_20?: number } }).bilanValues;
    if (bilanValues) {
      updateBilanSynthese(month, targetDay, 'ttc_5_5', formatImportedNumber(bilanValues.ttc_5_5 || 0));
      updateBilanSynthese(month, targetDay, 'ttc_10', formatImportedNumber(bilanValues.ttc_10 || 0));
      updateBilanSynthese(month, targetDay, 'ttc_20', formatImportedNumber(bilanValues.ttc_20 || 0));
    }`;

export const dashboardCaisseRecapPeriodePatch = (): Plugin => ({
  name: 'dashboard-caisse-recap-periode-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "import { parseHourInputToDecimal } from '@/utils';",
      "import { parseRecapPeriodeCaisse } from '@/caisseRecapPeriodeParser';\nimport { parseHourInputToDecimal } from '@/utils';",
      'import parser recap periode'
    );

    next = replaceRequired(
      next,
      "    updateTheorique,\n    updateNepting,",
      "    updateTheorique,\n    updateBilanSynthese,\n    updateNepting,",
      'updateBilanSynthese'
    );

    if (!next.includes('const findCaisseTtcByRate')) {
      next = replaceRequired(
        next,
        "  const extractCaisseNumbers = (text: string) => (text.match(/-?\\d[\\d\\s]*,\\d{2}/g) || []).map(parseCaisseNumber);",
        "  const extractCaisseNumbers = (text: string) => (text.match(/-?\\d[\\d\\s]*,\\d{2}/g) || []).map(parseCaisseNumber);\n  const findCaisseTtcByRate = (text: string, rate: '5,5' | '10' | '20') => {\n    const ratePattern = rate === '5,5' ? '5[,\\.]5' : rate;\n    const compactRatePattern = rate === '5,5' ? '5\\s*[,\\.]?\\s*5' : rate;\n    const lines = text.split(/\\r?\\n|(?=TVA\\s)/i).map(line => line.replace(/\\s+/g, ' ').trim()).filter(Boolean);\n    const matchingLines = lines.filter(line => new RegExp('(?:TVA|Taux|Total).*' + ratePattern + '|'+ ratePattern + '\\s*%', 'i').test(line));\n    const candidates = matchingLines.flatMap(line => extractCaisseNumbers(line));\n    if (candidates.length >= 3) return candidates[candidates.length - 1];\n    const sectionMatch = text.match(new RegExp('TVA[\\s\\S]{0,900}?' + compactRatePattern + '[\\s\\S]{0,220}', 'i'));\n    const sectionNumbers = sectionMatch ? extractCaisseNumbers(sectionMatch[0]) : [];\n    return sectionNumbers.length >= 3 ? sectionNumbers[sectionNumbers.length - 1] : 0;\n  };",
        'helper ttc tva'
      );
    }

    next = replaceRequired(
      next,
      "  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {\n    const text = sourceText.replace(/\\u00a0/g, ' ').replace(/€/g, '').replace(/\\s+/g, ' ');",
      "  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {\n    const recapPeriodeParsed = parseRecapPeriodeCaisse(sourceText, normalizeImportText);\n    if (recapPeriodeParsed) return recapPeriodeParsed as ParsedCaisseImport;\n\n    const text = sourceText.replace(/\\u00a0/g, ' ').replace(/€/g, '').replace(/\\s+/g, ' ');",
      'appel parser recap periode'
    );

    next = replaceRequired(
      next,
      "        clickCollect: findCaisseAmount(text, 'Click and Collect'),\n      },\n    };",
      "        clickCollect: findCaisseAmount(text, 'Click and Collect'),\n      },\n      bilanValues: {\n        ttc_5_5: findCaisseTtcByRate(text, '5,5'),\n        ttc_10: findCaisseTtcByRate(text, '10'),\n        ttc_20: findCaisseTtcByRate(text, '20'),\n      },\n    } as ParsedCaisseImport;",
      'bilan values historique'
    );

    const targetLine = "    updateTheorique(month, targetDay, 'sunday', formatImportedNumber(parsed.theoriqueValues.sunday));";
    const replacementLine = `${targetLine}${appendBilanUpdate}`;
    if (!next.includes('bilanValues?: { ttc_5_5?: number')) {
      next = next.split(targetLine).join(replacementLine);
    }

    return { code: next, map: null };
  },
});