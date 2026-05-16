import type { Plugin } from 'vite';

const mustReplace = (code: string, pattern: RegExp | string, replacement: string, label: string) => {
  const next = code.replace(pattern as any, replacement);
  if (next === code) throw new Error(`Patch Dashboard salaires non applique : ${label}`);
  return next;
};

const replaceEvery = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error(`Patch Dashboard salaires non applique : ${label}`);
  return code.split(from).join(to);
};

export const dashboardPayrollColumnPatch = (): Plugin => ({
  name: 'dashboard-payroll-column-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = mustReplace(next, "import { averagePayrollRate, buildPayrollImportFromText } from '@/personnelSalaryImport';", "import { averagePayrollRate, buildPayrollImportFromText, getPayrollTargetPeriodFromText } from '@/personnelSalaryImport';", 'import detection periode salaires');

    next = mustReplace(next, /const editableCols: number\[] = \[[\s\S]*?\n\];/, `const editableCols: number[] = [\n  6, 7, 8, 9, 14, 15, 17, 18, 19, 20, 25, 27, 34, 37, 38, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86\n];`, 'colonnes editables personnel');

    next = mustReplace(next, "cols[idx][1] = 'PROJECTION S/C';", "cols[idx][1] = idx >= 77 ? 'FRAIS PERSONNEL REALISE' : 'PROJECTION S/C';", 'entete projection/realise');
    next = mustReplace(next, "const namesStr = names.length > 0 ? `\\n${names.join(' + ')}` : '';", "const namesStr = '';", 'masquer noms salaries entetes');
    next = mustReplace(next, /updateHeader\(74[\s\S]*?updateHeader\(98, 'apprenti', 'APPRENTI\\nSALLE', 'salle'\);/, `updateHeader(62, 'cadre', 'CADRE\\nCUISINE', 'cuisine');\n      updateHeader(63, 'cadre', 'CADRE\\nSALLE', 'salle');\n      updateHeader(64, 'maitrise', 'MAITRISE\\nCUISINE', 'cuisine');\n      updateHeader(65, 'maitrise', 'MAITRISE\\nSALLE', 'salle');\n      updateHeader(66, 'niv12', 'NIV I ET II\\nCUISINE', 'cuisine');\n      updateHeader(67, 'niv12', 'NIV I ET II\\nSALLE', 'salle');\n      updateHeader(68, 'niv3', 'NIV III\\nCUISINE', 'cuisine');\n      updateHeader(69, 'niv3', 'NIV III\\nSALLE', 'salle');\n      updateHeader(70, 'apprenti', 'APPRENTI\\nCUISINE', 'cuisine');\n      updateHeader(71, 'apprenti', 'APPRENTI\\nSALLE', 'salle');\n      updateHeader(77, 'cadre', 'CADRE\\nCUISINE', 'cuisine');\n      updateHeader(78, 'cadre', 'CADRE\\nSALLE', 'salle');\n      updateHeader(79, 'maitrise', 'MAITRISE\\nCUISINE', 'cuisine');\n      updateHeader(80, 'maitrise', 'MAITRISE\\nSALLE', 'salle');\n      updateHeader(81, 'niv12', 'NIV I ET II\\nCUISINE', 'cuisine');\n      updateHeader(82, 'niv12', 'NIV I ET II\\nSALLE', 'salle');\n      updateHeader(83, 'niv3', 'NIV III\\nCUISINE', 'cuisine');\n      updateHeader(84, 'niv3', 'NIV III\\nSALLE', 'salle');\n      updateHeader(85, 'apprenti', 'APPRENTI\\nCUISINE', 'cuisine');\n      updateHeader(86, 'apprenti', 'APPRENTI\\nSALLE', 'salle');`, 'colonnes entetes salaires');

    next = mustReplace(next, /const colIdx = 78 \+ i;[^\n]*/, 'const colIdx = 62 + i;', 'colonnes saisie projection');
    next = mustReplace(next, 'const colIdx = 91 + i;', 'const colIdx = 77 + i;', 'colonnes saisie realise');

    next = mustReplace(next, "  const cellData = globalData[month]?.dashboard || {};", "  const isPayrollInputColumn = (colIndex: number) => (colIndex >= 62 && colIndex <= 71) || (colIndex >= 77 && colIndex <= 86);\n\n  const formatPayrollHourInputValue = (value: string | number | undefined) => {\n    if (value === undefined || value === null || value === '') return '';\n    const converted = parseHourInputToDecimal(value);\n    return converted > 0 ? converted.toFixed(2).replace('.', ',') : String(value);\n  };\n\n  const cellData = globalData[month]?.dashboard || {};", 'helpers conversion heures avant calculs');

    next = mustReplace(next, /    if \(isTextCol\) \{[\s\S]*?      updateDashboard\(month, `\$\{rIdx\}-\$\{cIdx\}`, cleanValue\);\n    \}/, `    if (isTextCol) {\n      updateDashboard(month, \`${rIdx}-${cIdx}\`, value);\n    } else if (isPayrollInputColumn(cIdx)) {\n      const converted = parseHourInputToDecimal(value);\n      updateDashboard(month, \`${rIdx}-${cIdx}\`, converted > 0 ? converted.toFixed(2) : '');\n    } else {\n      const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');\n      updateDashboard(month, \`${rIdx}-${cIdx}\`, cleanValue);\n    }`, 'conversion saisie heures personnel');

    next = replaceEvery(next, "data[`${rIdx}-65`] = totalHeuresProj.toFixed(2);", "data[`${rIdx}-61`] = totalHeuresProj.toFixed(2);", 'total heures projection jour');
    next = replaceEvery(next, "data[`${rIdx}-83`] = coutGlobalReal.toFixed(2);", "data[`${rIdx}-87`] = coutGlobalReal.toFixed(2);", 'cout realise jour');
    next = replaceEvery(next, "data[`${rIdx}-84`] = (realiseTotalJour / totalHeuresReal).toFixed(2);", "data[`${rIdx}-88`] = (realiseTotalJour / totalHeuresReal).toFixed(2);", 'productivite realise jour');
    next = replaceEvery(next, "data[`${rIdx}-85`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';", "data[`${rIdx}-89`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';", 'pourcentage realise jour');
    next = replaceEvery(next, "data[`${rIdx}-87`] = (totalHeuresReal - totalHeuresProj).toFixed(2);", "data[`${rIdx}-91`] = (totalHeuresReal - totalHeuresProj).toFixed(2);", 'ecart heures jour');
    next = replaceEvery(next, "data[`${rIdx}-88`] = (pctReal - pctProj).toFixed(2) + '%';", "data[`${rIdx}-92`] = (pctReal - pctProj).toFixed(2) + '%';", 'ecart sc jour');

    next = replaceEvery(next, '[7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 35, 59, 60, 73, 74, 77, 78, 79, 84, 85, 88]', '[7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 35, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92]', 'colonnes calculees totaux');

    next = replaceEvery(next, "const val = parseFloat(data[`${day.originalIdx}-${cIdx}`] || '0');\n            if (!isNaN(val) && data[`${day.originalIdx}-${cIdx}`]) {", "const rawVal = data[`${day.originalIdx}-${cIdx}`] || '';\n            const val = isPayrollInputColumn(cIdx) ? parseHourInputToDecimal(rawVal) : parseFloat(rawVal || '0');\n            if (!isNaN(val) && rawVal) {", 'conversion heures personnel totaux semaine/mois');

    next = replaceEvery(next, "const totalHeuresProjW = parseFloat(data[`${rIdx}-65`] || '0');", "const totalHeuresProjW = parseFloat(data[`${rIdx}-61`] || '0');", 'total heures projection semaine');
    next = replaceEvery(next, "const coutGlobalRealW = parseFloat(data[`${rIdx}-83`] || '0');", "const coutGlobalRealW = parseFloat(data[`${rIdx}-87`] || '0');", 'cout realise semaine');
    next = replaceEvery(next, "data[`${rIdx}-86`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';", "data[`${rIdx}-90`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';", 'ratio realise semaine');
    next = replaceEvery(next, "data[`${rIdx}-88`] = (pctRealW - pctProjW).toFixed(2) + '%';", "data[`${rIdx}-92`] = (pctRealW - pctProjW).toFixed(2) + '%';", 'ecart sc semaine');
    next = replaceEvery(next, "if (totalHeuresRealW > 0) data[`${rIdx}-84`] = (realiseCAW / totalHeuresRealW).toFixed(2);", "if (totalHeuresRealW > 0) data[`${rIdx}-88`] = (realiseCAW / totalHeuresRealW).toFixed(2);", 'productivite realise semaine');
    next = replaceEvery(next, "data[`${rIdx}-85`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';", "data[`${rIdx}-89`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';", 'pourcentage realise semaine');
    next = replaceEvery(next, "data[`${rIdx}-87`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);", "data[`${rIdx}-91`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);", 'ecart heures semaine');

    next = replaceEvery(next, "const totalHeuresProjM = parseFloat(data[`${monthTotalIdx}-65`] || '0');", "const totalHeuresProjM = parseFloat(data[`${monthTotalIdx}-61`] || '0');", 'total heures projection mois');
    next = replaceEvery(next, "const coutGlobalRealM = parseFloat(data[`${monthTotalIdx}-83`] || '0');", "const coutGlobalRealM = parseFloat(data[`${monthTotalIdx}-87`] || '0');", 'cout realise mois');
    next = replaceEvery(next, "if (totalHeuresRealM > 0) data[`${monthTotalIdx}-84`] = (realiseCAM / totalHeuresRealM).toFixed(2);", "if (totalHeuresRealM > 0) data[`${monthTotalIdx}-88`] = (realiseCAM / totalHeuresRealM).toFixed(2);", 'productivite realise mois');
    next = replaceEvery(next, "data[`${monthTotalIdx}-85`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';", "data[`${monthTotalIdx}-89`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';", 'pourcentage realise mois');
    next = replaceEvery(next, "data[`${monthTotalIdx}-86`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';", "data[`${monthTotalIdx}-90`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';", 'ratio realise mois');
    next = replaceEvery(next, "data[`${monthTotalIdx}-87`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);", "data[`${monthTotalIdx}-91`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);", 'ecart heures mois');
    next = replaceEvery(next, "data[`${monthTotalIdx}-88`] = (pctRealM - pctProjM).toFixed(2) + '%';", "data[`${monthTotalIdx}-92`] = (pctRealM - pctProjM).toFixed(2) + '%';", 'ecart sc mois');

    next = replaceEvery(next, "fraisPersonnel: parseDashboardNumber(calculatedData[`${monthTotalIdx}-83`]),", "fraisPersonnel: parseDashboardNumber(calculatedData[`${monthTotalIdx}-87`]),", 'kpi frais personnel');
    next = replaceEvery(next, '65, 72, 73, 74, 76, 83, 84, 85, 87, 88,', '61, 72, 73, 74, 75, 76, 87, 88, 89, 90, 91, 92,', 'colonnes contexte personnel');
    next = replaceEvery(next, "const nbHBudget  = parseFloat(calculatedData[`${mtIdx}-77`]  || '0');", "const nbHBudget  = parseFloat(calculatedData[`${mtIdx}-61`] || '0');", 'resultats nb heures budget');
    next = replaceEvery(next, "const coutProj   = parseFloat(calculatedData[`${mtIdx}-88`]  || '0');", "const coutProj   = parseFloat(calculatedData[`${mtIdx}-72`] || '0');", 'resultats cout projection');
    next = replaceEvery(next, "const nbHReel    = parseFloat(calculatedData[`${mtIdx}-92`]  || '0');", "const nbHReel    = parseFloat(calculatedData[`${mtIdx}-76`] || '0');", 'resultats nb heures reel');
    next = replaceEvery(next, "const coutReel   = parseFloat(calculatedData[`${mtIdx}-103`] || '0');", "const coutReel   = parseFloat(calculatedData[`${mtIdx}-87`] || '0');", 'resultats cout reel');

    next = mustReplace(next, "  const formatValue = (val: string | number | undefined, c: string[]) => {", "  const formatValue = (val: string | number | undefined, c: string[], colIndex?: number) => {", 'signature formatValue colonne');
    next = mustReplace(next, "    if (val === '' || val === undefined || val === null) return '';\n    \n    // If the value already contains a percentage sign, return it as is", "    if (val === '' || val === undefined || val === null) return '';\n\n    if (typeof colIndex === 'number' && isPayrollInputColumn(colIndex)) {\n      return formatPayrollHourInputValue(val);\n    }\n    \n    // If the value already contains a percentage sign, return it as is", 'format affichage heures personnel');
    next = mustReplace(next, "  const getDailyDisplayValue = (col: number) => formatValue(getDailyCellValue(col), dynamicColumns[col] || ['', '', '', '']);", "  const getDailyDisplayValue = (col: number) => formatValue(getDailyCellValue(col), dynamicColumns[col] || ['', '', '', ''], col);", 'affichage saisie journaliere heures');
    next = mustReplace(next, "const displayVal = formatValue(val, [c[0], c[1], c[2], c[3]]);", "const displayVal = formatValue(val, [c[0], c[1], c[2], c[3]], originalCIdx);", 'affichage tableau complet heures');

    next = replaceEvery(next, "const result = buildPayrollImportFromText(text, configuredPersonnel);", "const payrollPeriod = getPayrollTargetPeriodFromText(text);\n      if (!payrollPeriod) {\n        setSalaryImportStatus('Erreur : le mois du PDF salaires n a pas pu etre detecte.');\n        return;\n      }\n      const result = buildPayrollImportFromText(text, configuredPersonnel);", 'detection mois pdf salaires');

    next = replaceEvery(next, "const currentConfig = globalData[month]?.salariesConfig || { locked: false, categories: result.categories };", "const targetMonth = payrollPeriod.targetMonth;\n      const currentConfig = globalData[targetMonth]?.salariesConfig || { locked: false, categories: result.categories };", 'mois cible config salaires');

    next = replaceEvery(next, "updateSalariesConfig(month, {", "updateSalariesConfig(targetMonth, {", 'sauvegarde snapshot mois cible');
    next = replaceEvery(next, "setSalaryImportStatus(`${result.matches.length} salarie(s) importe(s) sur ${selectedMonthLabel}. Taux horaires mis a jour par statut et section.${unmatchedText}`);", "setMonth(targetMonth);\n      setSelectedMonth(targetMonth);\n      setSalaryImportStatus(`${result.matches.length} salarie(s) importe(s). PDF ${payrollPeriod.sourceLabel} applique sur ${payrollPeriod.targetLabel}. Snapshot des taux sauvegarde, aucun import brut conserve.${unmatchedText}`);", 'message import salaires mois cible');

    return { code: next, map: null };
  },
});
