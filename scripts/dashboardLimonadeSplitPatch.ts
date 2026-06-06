import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch detail limonade non applique : ' + label);
  return code.replace(from, to);
};

const replacePatternRequired = (
  code: string,
  pattern: RegExp,
  to: string | ((substring: string, ...args: any[]) => string),
  label: string,
) => {
  if (!pattern.test(code)) throw new Error('Patch detail limonade non applique : ' + label);
  return code.replace(pattern, to as any);
};

export const dashboardLimonadeSplitPatch = (): Plugin => ({
  name: 'dashboard-limonade-split-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    if (next.includes("  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white']\n];")) {
      next = replaceRequired(
      next,
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white']\n];",
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white'],\n  ['REALISE', 'CA HT LIMONADE', 'MIDI', 'bg-[#b4c6e7]'],\n  ['REALISE', 'CA HT LIMONADE', 'SOIR', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'MIDI\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'MIDI\\nMOY', 'bg-white'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nMOY', 'bg-white']\n];",
      'colonnes detail limonade'
      );
    }

    next = replaceRequired(
      next,
      "    return dynamicColumns.map((c, index) => Object.assign([...c] as DashboardColumn, { originalIndex: index })).filter(c => {",
      "    const baseVisibleColumns = dynamicColumns.map((c, index) => Object.assign([...c] as DashboardColumn, { originalIndex: index })).filter(c => {",
      'base visible columns'
    );

    next = replaceRequired(
      next,
      "      return !isEditableColumn || contextColumns.has(colIndex);\n    });\n  }, [activeTab, tableViewMode, dynamicColumns]);",
      "      return !isEditableColumn || contextColumns.has(colIndex);\n    });\n\n    const limonadeMoveSet = new Set([20, 34, 35, 36, 110, 111, 113, 114, 115, 116]);\n    const limonadeCaOrder = [110, 111, 20];\n    const limonadeCouvertsOrder = [113, 114, 115, 116, 34, 35, 36];\n    const findColumn = (colIndex: number) => baseVisibleColumns.find(col => col.originalIndex === colIndex);\n    const limonadeCaColumns = limonadeCaOrder.map(findColumn).filter(Boolean) as VisibleDashboardColumn[];\n    const limonadeCouvertsColumns = limonadeCouvertsOrder.map(findColumn).filter(Boolean) as VisibleDashboardColumn[];\n    if (limonadeCaColumns.length === 0 && limonadeCouvertsColumns.length === 0) return baseVisibleColumns;\n\n    const withoutMovedLimonade = baseVisibleColumns.filter(col => !limonadeMoveSet.has(col.originalIndex));\n    const insertAfterSoirCa = withoutMovedLimonade.findIndex(col => col.originalIndex === 19);\n    const withCaLimonade = insertAfterSoirCa === -1\n      ? withoutMovedLimonade\n      : [\n        ...withoutMovedLimonade.slice(0, insertAfterSoirCa + 1),\n        ...limonadeCaColumns,\n        ...withoutMovedLimonade.slice(insertAfterSoirCa + 1),\n      ];\n\n    const insertAfterRestaurant = withCaLimonade.findIndex(col => col.originalIndex === 33);\n    if (insertAfterRestaurant === -1) return withCaLimonade;\n\n    return [\n      ...withCaLimonade.slice(0, insertAfterRestaurant + 1),\n      ...limonadeCouvertsColumns,\n      ...withCaLimonade.slice(insertAfterRestaurant + 1),\n    ];\n  }, [activeTab, tableViewMode, dynamicColumns]);",
      'placement visible colonnes limonade'
    );

    next = replaceRequired(
      next,
      "        const realiseLimo = parseFloat(data[`${rIdx}-20`] || '0');\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      "        const realiseLimoMidiDetail = parseFloat(data[`${rIdx}-110`] || '0');\n        const realiseLimoSoirDetail = parseFloat(data[`${rIdx}-111`] || '0');\n        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;\n        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseFloat(data[`${rIdx}-20`] || '0');\n        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);\n        const realiseRestaurantTotal = realiseMidi + realiseSoir;\n        if (realiseRestaurantTotal > 0 || data[`${rIdx}-18`] || data[`${rIdx}-19`]) data[`${rIdx}-116`] = realiseRestaurantTotal.toFixed(2);\n        const realiseTotalJour = realiseVae + realiseRestaurantTotal + realiseLimo;",
      'calcul ca detail limonade'
    );

    next = replaceRequired(
      next,
      "        // COUVERTS LIMONADE — 32=NB,33=MOY,34=CUMUL\n        const nbCvtsLimo = parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
      "        // COUVERTS LIMONADE — detail midi/soir + total historique\n        const nbCvtsLimoMidiDetail = parseFloat(data[`${rIdx}-113`] || '0');\n        const nbCvtsLimoSoirDetail = parseFloat(data[`${rIdx}-115`] || '0');\n        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;\n        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimoDetailTotal > 0) data[`${rIdx}-34`] = nbCvtsLimoDetailTotal.toFixed(0);\n        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[`${rIdx}-114`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);\n        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[`${rIdx}-116`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);\n        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
      'calcul couverts detail limonade'
    );

    next = replaceRequired(
      next,
      "{renderDailyServiceRow('Limonade', 20, 34, 35)}",
      "{renderDailyServiceRow('Limonade midi', 110, 113, 114)}\n                  {renderDailyServiceRow('Limonade soir', 111, 115, 116)}",
      'vue saisie detail limonade'
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

    next = replacePatternRequired(
      next,
      / {8}\/\/ COUVERTS LIMONADE .* detail midi\/soir \+ total historique[\s\S]*?\n {8}}\n\n {8}\/\/ COUT MATIERE calculations/,
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
      `          {renderDailySection('Achats / livraisons', 'Factures fournisseurs reçues dans la journée', (
            <>
              {achatFields}
              {renderDailyTotalRow([
                { label: 'Total achats HT', col: 58 },
              ])}
            </>
          ), '#16a34a')}

          {renderDailySection('Personnel', 'Saisie des heures par équipe et masse salariale liée au CA du jour', (
            renderPersonnelTable(
              <>
                {dailyPersonnelRows.map(([label, cuisineCol, salleCol]) => renderPersonnelRow(label, cuisineCol, salleCol))}
                {renderDailyTotalRow(dailyPersonnelTotals)}
              </>
            )
          ), '#9333ea')}`,
      `          {renderDailySection('Personnel', 'Saisie des heures par équipe et masse salariale liée au CA du jour', (
            renderPersonnelTable(
              <>
                {dailyPersonnelRows.map(([label, cuisineCol, salleCol]) => renderPersonnelRow(label, cuisineCol, salleCol))}
                {renderDailyTotalRow(dailyPersonnelTotals)}
              </>
            )
          ), '#9333ea')}

          {renderDailySection('Achats / livraisons', 'Factures fournisseurs reçues dans la journée', (
            <>
              {achatFields}
              {renderDailyTotalRow([
                { label: 'Total achats HT', col: 58 },
              ])}
            </>
          ), '#16a34a')}`,
      'ordre personnel achats'
    );

    return { code: next, map: null };
  },
});
