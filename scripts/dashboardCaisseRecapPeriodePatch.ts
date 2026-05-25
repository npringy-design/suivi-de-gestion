import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch import caisse recap periode non applique : ' + label);
  return code.replace(from, to);
};

const appendBilanUpdate = `
    const bilanValues = (parsed as ParsedCaisseImport & { bilanValues?: { ttc_5_5?: number; ttc_10?: number; ttc_20?: number } }).bilanValues;
    if (bilanValues) {
      updateBilanSynthese(targetMonth, targetDay, 'ttc_5_5', formatImportedNumber(bilanValues.ttc_5_5 || 0));
      updateBilanSynthese(targetMonth, targetDay, 'ttc_10', formatImportedNumber(bilanValues.ttc_10 || 0));
      updateBilanSynthese(targetMonth, targetDay, 'ttc_20', formatImportedNumber(bilanValues.ttc_20 || 0));
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

    next = replaceRequired(
      next,
      "    const usePdfDay = importDay && importMonth === month && importYear === year;\n    const targetDayEntry = usePdfDay\n      ? dayRows.find(item => item.row.dayIndex === importDay)\n      : selectedDayEntry;\n    const targetRowIndex = targetDayEntry?.index ?? selectedDayRowIndex;",
      "    const usePdfDate = !!importDay && importMonth !== null && importYear === year;\n    const targetMonth = usePdfDate && importMonth !== null ? importMonth : month;\n    const targetDay = usePdfDate && importDay ? importDay : selectedEntryDay;\n    const targetRowIndex = usePdfDate\n      ? getDashboardRowIndexForDay(year, targetMonth, targetDay)\n      : selectedDayRowIndex;\n    const targetDayEntry = targetMonth === month\n      ? dayRows.find(item => item.index === targetRowIndex)\n      : null;",
      'date cible import caisse'
    );

    next = replaceRequired(
      next,
      "    const targetDay = targetDayEntry?.row.dayIndex || selectedEntryDay;\n    const parsed = caisseImportPreview.parsed;\n    Object.entries(parsed.values).forEach(([col, value]) => {\n      handleCellChange(targetRowIndex, Number(col), formatImportedNumber(value, Number(col) === 25 || Number(col) === 27 || Number(col) === 34 ? 0 : 2));\n    });\n    updateTheorique(month, targetDay, 'total_ca', formatImportedNumber(parsed.theoriqueValues.total_ca));\n    updateTheorique(month, targetDay, 'cb', formatImportedNumber(parsed.theoriqueValues.cb));\n    updateTheorique(month, targetDay, 'amex', formatImportedNumber(parsed.theoriqueValues.amex));\n    updateTheorique(month, targetDay, 'tr_papier', formatImportedNumber(parsed.theoriqueValues.tr_papier));\n    updateTheorique(month, targetDay, 'tr_carte', formatImportedNumber(parsed.theoriqueValues.tr_carte));\n    updateTheorique(month, targetDay, 'ancv', formatImportedNumber(parsed.theoriqueValues.ancv));\n    updateTheorique(month, targetDay, 'especes', formatImportedNumber(parsed.theoriqueValues.especes));\n    updateTheorique(month, targetDay, 'click_collect', formatImportedNumber(parsed.theoriqueValues.click_collect));\n    updateTheorique(month, targetDay, 'uber', formatImportedNumber(parsed.theoriqueValues.uber));\n    updateTheorique(month, targetDay, 'deliveroo', formatImportedNumber(parsed.theoriqueValues.deliveroo));\n    updateTheorique(month, targetDay, 'sunday', formatImportedNumber(parsed.theoriqueValues.sunday));",
      "    const parsed = caisseImportPreview.parsed;\n    Object.entries(parsed.values).forEach(([col, value]) => {\n      const formattedValue = formatImportedNumber(value, Number(col) === 25 || Number(col) === 27 || Number(col) === 34 ? 0 : 2);\n      if (targetMonth === month) {\n        handleCellChange(targetRowIndex, Number(col), formattedValue);\n      } else {\n        updateDashboard(targetMonth, `${targetRowIndex}-${Number(col)}`, formattedValue);\n      }\n    });\n    updateTheorique(targetMonth, targetDay, 'total_ca', formatImportedNumber(parsed.theoriqueValues.total_ca));\n    updateTheorique(targetMonth, targetDay, 'cb', formatImportedNumber(parsed.theoriqueValues.cb));\n    updateTheorique(targetMonth, targetDay, 'amex', formatImportedNumber(parsed.theoriqueValues.amex));\n    updateTheorique(targetMonth, targetDay, 'tr_papier', formatImportedNumber(parsed.theoriqueValues.tr_papier));\n    updateTheorique(targetMonth, targetDay, 'tr_carte', formatImportedNumber(parsed.theoriqueValues.tr_carte));\n    updateTheorique(targetMonth, targetDay, 'ancv', formatImportedNumber(parsed.theoriqueValues.ancv));\n    updateTheorique(targetMonth, targetDay, 'especes', formatImportedNumber(parsed.theoriqueValues.especes));\n    updateTheorique(targetMonth, targetDay, 'click_collect', formatImportedNumber(parsed.theoriqueValues.click_collect));\n    updateTheorique(targetMonth, targetDay, 'uber', formatImportedNumber(parsed.theoriqueValues.uber));\n    updateTheorique(targetMonth, targetDay, 'deliveroo', formatImportedNumber(parsed.theoriqueValues.deliveroo));\n    updateTheorique(targetMonth, targetDay, 'sunday', formatImportedNumber(parsed.theoriqueValues.sunday));" + appendBilanUpdate,
      'application import caisse sur mois pdf'
    );

    next = replaceRequired(
      next,
      "    if (targetDayEntry?.row.dayIndex) setSelectedEntryDay(targetDayEntry.row.dayIndex);",
      "    if (targetMonth !== month) {\n      setMonth(targetMonth);\n      setSelectedMonth(targetMonth);\n    }\n    setSelectedEntryDay(targetDay);",
      'selection jour import caisse'
    );

    next = replaceRequired(
      next,
      "    const targetLabel = targetDayEntry?.row.label || selectedDayLabel;",
      "    const targetLabel = usePdfDate\n      ? `${String(targetDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${year}`\n      : targetDayEntry?.row.label || selectedDayLabel;",
      'libelle import caisse'
    );

    return { code: next, map: null };
  },
});