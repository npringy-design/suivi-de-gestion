import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch detail limonade non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardLimonadeSplitPatch = (): Plugin => ({
  name: 'dashboard-limonade-split-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white']\n];",
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white'],\n  ['REALISE', 'CA HT LIMONADE', 'MIDI', 'bg-[#b4c6e7]'],\n  ['REALISE', 'CA HT LIMONADE', 'SOIR', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'MIDI\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'MIDI\\nMOY', 'bg-white'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS\\nLIMONADE', 'SOIR\\nMOY', 'bg-white']\n];",
      'colonnes detail limonade'
    );

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
      "        const realiseLimoMidiDetail = parseFloat(data[`${rIdx}-110`] || '0');\n        const realiseLimoSoirDetail = parseFloat(data[`${rIdx}-111`] || '0');\n        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;\n        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseFloat(data[`${rIdx}-20`] || '0');\n        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
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
