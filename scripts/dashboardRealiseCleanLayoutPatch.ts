import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch vue realise/prevision propre non applique : ' + label);
  return code.replace(from, to);
};

const replacePatternRequired = (
  code: string,
  pattern: RegExp,
  to: string | ((substring: string, ...args: any[]) => string),
  label: string,
) => {
  if (!pattern.test(code)) throw new Error('Patch vue realise/prevision propre non applique : ' + label);
  return code.replace(pattern, to as any);
};

const replacePatternIfPresent = (
  code: string,
  pattern: RegExp,
  to: string | ((substring: string, ...args: any[]) => string),
) => (pattern.test(code) ? code.replace(pattern, to as any) : code);

export const dashboardRealiseCleanLayoutPatch = (): Plugin => ({
  name: 'dashboard-realise-clean-layout-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    if (next.includes("  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nMOY', 'bg-white']\n];")) {
      next = replaceRequired(
      next,
      "  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nMOY', 'bg-white']\n];",
      "  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nMOY', 'bg-white'],\n  ['REALISE', 'CA HT RESTAURANT', 'TOTAL', 'bg-[#b4c6e7]'],\n  ['REALISE', 'ECART BUDGET', '%', 'bg-white'],\n  ['REALISE', 'ECART VS N-1', 'VALEUR', 'bg-white'],\n  ['REALISE', 'ECART VS N-1', '%', 'bg-white'],\n  ['REALISE', 'COUVERTS', 'TOTAL JOUR', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS', 'CUMUL MOIS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'ECART BUDGET', '%', 'bg-white'],\n  ['REALISE', 'ECART VS N-1', 'VALEUR', 'bg-white'],\n  ['REALISE', 'ECART VS N-1', '%', 'bg-white'],\n  ['CA', 'CA HT RESTAURANT', 'TOTAL', 'bg-[#ffe699]'],\n  ['RESTAURANTS', 'COUVERTS', 'TOTAL JOUR', 'bg-[#fff2cc]'],\n  ['RESTAURANTS', 'COUVERTS', 'CUMUL MOIS', 'bg-[#fff2cc]'],\n  ['CA', 'ECART VS N-1', 'VALEUR', 'bg-white'],\n  ['RESTAURANTS', 'ECART VS N-1', 'VALEUR', 'bg-white']\n];",
      'colonnes complementaires realise et prevision'
      );
    }

    next = replacePatternIfPresent(
      next,
      /const editableCols: number\[] = \[([\s\S]*?)\n\];/,
      (match: string) => match.includes('110') ? match : match.replace('\n];', ', 110, 111, 112, 114\n];'),
    );

    next = replacePatternRequired(
      next,
      / {4}const limonadeMoveSet[\s\S]*?\n {2}}, \[activeTab, tableViewMode, dynamicColumns\]\);/,
      `    const thilloisNoLimonadeColumns = new Set([2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115]);
    const visibleColumnsWithoutLimonade = baseVisibleColumns.filter(col => {
      const text = [col[0], col[1], col[2]].join(' ').toUpperCase();
      return !thilloisNoLimonadeColumns.has(col.originalIndex) && !text.includes('LIMONADE');
    });
    const findColumn = (colIndex: number) => visibleColumnsWithoutLimonade.find(col => col.originalIndex === colIndex);
    const buildColumn = (colIndex: number, group: string, subGroup: string, label: string, bg?: string) => {
      const source = findColumn(colIndex);
      if (!source) return null;
      const column = Object.assign([...source] as DashboardColumn, { originalIndex: source.originalIndex });
      column[0] = group;
      column[1] = subGroup;
      column[2] = label;
      if (bg) column[3] = bg;
      return column as VisibleDashboardColumn;
    };

    if (activeTab === 'PREVISIONS' && tableViewMode === 'COMPLET') {
      return [
        buildColumn(0, 'CA HT', 'CA HT RESTAURANT', 'MIDI'),
        buildColumn(1, 'CA HT', 'CA HT RESTAURANT', 'SOIR'),
        buildColumn(125, 'CA HT', 'CA HT RESTAURANT', 'TOTAL'),
        buildColumn(2, 'CA HT', 'CA HT LIMONADE', 'TOTAL'),
        buildColumn(3, 'CA HT', '', 'TOTAL JOUR'),
        buildColumn(4, 'CA HT', '', 'CUMUL MOIS'),
        buildColumn(128, 'CA HT', 'ECART VS N-1', 'VALEUR', 'bg-white'),
        buildColumn(5, 'CA HT', 'ECART VS N-1', '%', 'bg-white'),
        buildColumn(6, 'COUVERTS', 'COUVERTS RESTAURANT', 'MIDI'),
        buildColumn(7, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM MIDI'),
        buildColumn(8, 'COUVERTS', 'COUVERTS RESTAURANT', 'SOIR'),
        buildColumn(9, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM SOIR'),
        buildColumn(10, 'COUVERTS', 'COUVERTS RESTAURANT', 'TOTAL'),
        buildColumn(11, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM TOTAL'),
        buildColumn(14, 'COUVERTS', 'COUVERTS LIMONADE', 'TOTAL'),
        buildColumn(15, 'COUVERTS', 'COUVERTS LIMONADE', 'TM TOTAL'),
        buildColumn(126, 'COUVERTS', '', 'TOTAL JOUR'),
        buildColumn(127, 'COUVERTS', '', 'CUMUL MOIS'),
        buildColumn(129, 'COUVERTS', 'ECART VS N-1', 'VALEUR', 'bg-white'),
        buildColumn(13, 'COUVERTS', 'ECART VS N-1', '%', 'bg-white'),
      ].filter(Boolean) as VisibleDashboardColumn[];
    }

    if (activeTab !== 'REALISE' || tableViewMode !== 'COMPLET') return visibleColumnsWithoutLimonade;

    return [
      buildColumn(17, 'CA HT', '', 'VAE'),
      buildColumn(18, 'CA HT', 'CA HT RESTAURANT', 'MIDI'),
      buildColumn(19, 'CA HT', 'CA HT RESTAURANT', 'SOIR'),
      buildColumn(116, 'CA HT', 'CA HT RESTAURANT', 'TOTAL'),
      buildColumn(110, 'CA HT', 'CA HT LIMONADE', 'MIDI'),
      buildColumn(111, 'CA HT', 'CA HT LIMONADE', 'SOIR'),
      buildColumn(20, 'CA HT', 'CA HT LIMONADE', 'TOTAL'),
      buildColumn(21, 'CA HT', '', 'TOTAL JOUR'),
      buildColumn(23, 'CA HT', '', 'CUMUL MOIS'),
      buildColumn(22, 'CA HT', 'ECART BUDGET', 'VALEUR', 'bg-white'),
      buildColumn(117, 'CA HT', 'ECART BUDGET', '%', 'bg-white'),
      buildColumn(118, 'CA HT', 'ECART VS N-1', 'VALEUR', 'bg-white'),
      buildColumn(119, 'CA HT', 'ECART VS N-1', '%', 'bg-white'),
      buildColumn(25, 'COUVERTS', 'COUVERTS RESTAURANT', 'MIDI'),
      buildColumn(26, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM MIDI'),
      buildColumn(27, 'COUVERTS', 'COUVERTS RESTAURANT', 'SOIR'),
      buildColumn(28, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM SOIR'),
      buildColumn(29, 'COUVERTS', 'COUVERTS RESTAURANT', 'TOTAL'),
      buildColumn(30, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM TOTAL'),
      buildColumn(112, 'COUVERTS', 'COUVERTS LIMONADE', 'MIDI'),
      buildColumn(113, 'COUVERTS', 'COUVERTS LIMONADE', 'TM MIDI'),
      buildColumn(114, 'COUVERTS', 'COUVERTS LIMONADE', 'SOIR'),
      buildColumn(115, 'COUVERTS', 'COUVERTS LIMONADE', 'TM SOIR'),
      buildColumn(34, 'COUVERTS', 'COUVERTS LIMONADE', 'TOTAL'),
      buildColumn(35, 'COUVERTS', 'COUVERTS LIMONADE', 'TM TOTAL'),
      buildColumn(120, 'COUVERTS', '', 'TOTAL JOUR'),
      buildColumn(121, 'COUVERTS', '', 'CUMUL MOIS'),
      buildColumn(33, 'COUVERTS', 'ECART BUDGET', 'VALEUR', 'bg-white'),
      buildColumn(122, 'COUVERTS', 'ECART BUDGET', '%', 'bg-white'),
      buildColumn(123, 'COUVERTS', 'ECART VS N-1', 'VALEUR', 'bg-white'),
      buildColumn(124, 'COUVERTS', 'ECART VS N-1', '%', 'bg-white'),
    ].filter(Boolean) as VisibleDashboardColumn[];
  }, [activeTab, tableViewMode, dynamicColumns]);`,
      'ordre visible realise et prevision complet'
    );

    next = replaceRequired(
      next,
      "    let cumulCvtsLimo = 0;",
      "    let cumulCvtsLimo = 0;\n    let cumulCvtsBudgetComplet = 0;",
      'cumul couverts prevision complet'
    );

    next = replaceRequired(
      next,
      "        const totalJour = budgetMidi + budgetSoir + budgetLimo;",
      "        const budgetRestaurantTotal = budgetMidi + budgetSoir;\n        if (budgetRestaurantTotal > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`]) data[`${rIdx}-125`] = budgetRestaurantTotal.toFixed(2);\n\n        const totalJour = budgetRestaurantTotal + budgetLimo;",
      'total restaurant prevision'
    );

    next = replaceRequired(
      next,
      "          data[`${rIdx}-12`] = cumulCvts.toString();\n        }\n\n        // REALISE CA HT",
      "          data[`${rIdx}-12`] = cumulCvts.toString();\n        }\n\n        const budgetCvtsComplet = jourCvts + cvtsLimo;\n        if (budgetCvtsComplet > 0 || data[`${rIdx}-10`] || data[`${rIdx}-14`]) {\n          cumulCvtsBudgetComplet += budgetCvtsComplet;\n          data[`${rIdx}-126`] = budgetCvtsComplet.toFixed(0);\n          data[`${rIdx}-127`] = cumulCvtsBudgetComplet.toFixed(0);\n        }\n\n        // REALISE CA HT",
      'total couverts prevision complet'
    );

    next = replaceRequired(
      next,
      "        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      "        const realiseRestaurantTotal = realiseMidi + realiseSoir;\n        if (realiseRestaurantTotal > 0 || data[`${rIdx}-18`] || data[`${rIdx}-19`]) data[`${rIdx}-116`] = realiseRestaurantTotal.toFixed(2);\n        const realiseTotalJour = realiseVae + realiseRestaurantTotal + realiseLimo;",
      'total restaurant realise'
    );

    next = replaceRequired(
      next,
      "          data[`${rIdx}-22`] = (realiseTotalJour - totalJour).toFixed(2);",
      "          const realiseEcartBudget = realiseTotalJour - totalJour;\n          data[`${rIdx}-22`] = realiseEcartBudget.toFixed(2);\n          if (totalJour > 0) data[`${rIdx}-117`] = ((realiseEcartBudget / totalJour) * 100).toFixed(2);",
      'pourcentage ecart ca'
    );

    next = replacePatternRequired(
      next,
      / {8}\/\/ COUVERTS LIMONADE — detail midi\/soir \+ total historique[\s\S]*?\n {8}}\n\n {8}\/\/ COUT MATIERE calculations/,
      `        // COUVERTS LIMONADE — detail midi/soir + total historique
        const nbCvtsLimoMidiDetail = parseFloat(data[\`\${rIdx}-112\`] || '0');
        const nbCvtsLimoSoirDetail = parseFloat(data[\`\${rIdx}-114\`] || '0');
        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;
        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseFloat(data[\`\${rIdx}-34\`] || '0');
        if (nbCvtsLimoDetailTotal > 0) data[\`\${rIdx}-34\`] = nbCvtsLimoDetailTotal.toFixed(0);
        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[\`\${rIdx}-113\`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);
        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[\`\${rIdx}-115\`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);
        if (nbCvtsLimo > 0 && realiseLimo > 0) data[\`\${rIdx}-35\`] = (realiseLimo / nbCvtsLimo).toFixed(2);
        if (nbCvtsLimo > 0) {
          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;
          data[\`\${rIdx}-36\`] = cumulCvtsLimo.toFixed(0);
        }
        const totalCvtsJourComplet = totalCvtsJour + nbCvtsLimo;
        if (totalCvtsJourComplet > 0) {
          data[\`\${rIdx}-120\`] = totalCvtsJourComplet.toFixed(0);
          data[\`\${rIdx}-121\`] = (cumulCvtsRealise + cumulCvtsLimo).toFixed(0);
          const budgetCvtsJourComplet = parseFloat(data[\`\${rIdx}-10\`] || '0') + parseFloat(data[\`\${rIdx}-14\`] || '0');
          if (budgetCvtsJourComplet > 0) {
            const ecartCvtsComplet = totalCvtsJourComplet - budgetCvtsJourComplet;
            data[\`\${rIdx}-33\`] = ecartCvtsComplet.toFixed(0);
            data[\`\${rIdx}-122\`] = ((ecartCvtsComplet / budgetCvtsJourComplet) * 100).toFixed(2);
          }
        }

        // COUT MATIERE calculations`,
      'calcul couverts realise complet'
    );

    next = replaceRequired(
      next,
      "{renderDailyServiceRow('Limonade midi', 110, 113, 114)}\n                  {renderDailyServiceRow('Limonade soir', 111, 115, 116)}",
      "",
      'colonnes saisie limonade corrigees'
    );

    next = replaceRequired(
      next,
      "  const previsionsGroups = groups.filter(g => ['CA', 'RESTAURANTS', 'LIMONADE'].includes(g.name));",
      "  const previsionsGroups = groups.filter(g => activeTab === 'PREVISIONS'\n    ? ['CA', 'RESTAURANTS', 'LIMONADE', 'CA HT', 'COUVERTS'].includes(g.name)\n    : ['CA', 'RESTAURANTS', 'LIMONADE'].includes(g.name));",
      'groupes prevision'
    );

    next = replaceRequired(
      next,
      "  const realiseGroups = groups.filter(g => ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));",
      "  const realiseGroups = groups.filter(g => activeTab === 'REALISE'\n    ? ['REALISE', 'CA HT', 'COUVERTS', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name)\n    : ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));",
      'groupes realise'
    );

    next = replaceRequired(
      next,
      "  const otherGroups = groups.filter(g => !['CA', 'RESTAURANTS', 'LIMONADE', 'REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));",
      "  const otherGroups = groups.filter(g => !['CA', 'RESTAURANTS', 'LIMONADE', 'REALISE', 'CA HT', 'COUVERTS', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));",
      'autres groupes'
    );

    next = replaceRequired(
      next,
      "RÉALISÉ &amp; ÉVÉNEMENTS",
      "{activeTab === 'REALISE' && tableViewMode === 'COMPLET' ? 'RÉALISÉ' : 'RÉALISÉ & ÉVÉNEMENTS'}",
      'titre realise complet'
    );

    return { code: next, map: null };
  },
});
