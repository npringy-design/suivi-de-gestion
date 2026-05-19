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
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white'],\n  ['REALISE', 'LIMONADE MIDI', 'CA HT', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE MIDI', 'NB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE MIDI', 'TM', 'bg-white'],\n  ['REALISE', 'LIMONADE SOIR', 'CA HT', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE SOIR', 'NB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE SOIR', 'TM', 'bg-white'],\n  ['REALISE', 'LIMONADE TOTAL', 'CA HT', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE TOTAL', 'NB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'LIMONADE TOTAL', 'TM', 'bg-white']\n];",
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
      "      return !isEditableColumn || contextColumns.has(colIndex);\n    });\n\n    const limonadeDetailOrder = [110, 113, 114, 111, 115, 116, 112, 117, 118];\n    const limonadeDetailSet = new Set(limonadeDetailOrder);\n    const limonadeDetailColumns = limonadeDetailOrder\n      .map(colIndex => baseVisibleColumns.find(col => col.originalIndex === colIndex))\n      .filter(Boolean) as VisibleDashboardColumn[];\n\n    if (limonadeDetailColumns.length === 0) return baseVisibleColumns;\n\n    const withoutLimonadeDetail = baseVisibleColumns.filter(col => !limonadeDetailSet.has(col.originalIndex));\n    const insertAfterLimonadeTotal = withoutLimonadeDetail.findIndex(col => col.originalIndex === 36);\n    if (insertAfterLimonadeTotal === -1) return baseVisibleColumns;\n\n    return [\n      ...withoutLimonadeDetail.slice(0, insertAfterLimonadeTotal + 1),\n      ...limonadeDetailColumns,\n      ...withoutLimonadeDetail.slice(insertAfterLimonadeTotal + 1),\n    ];\n  }, [activeTab, tableViewMode, dynamicColumns]);",
      'placement visible colonnes limonade'
    );

    next = replaceRequired(
      next,
      "        const realiseLimo = parseFloat(data[`${rIdx}-20`] || '0');\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      "        const realiseLimoMidiDetail = parseFloat(data[`${rIdx}-110`] || '0');\n        const realiseLimoSoirDetail = parseFloat(data[`${rIdx}-111`] || '0');\n        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;\n        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseFloat(data[`${rIdx}-20`] || '0');\n        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);\n        if (realiseLimo > 0 || data[`${rIdx}-110`] || data[`${rIdx}-111`] || data[`${rIdx}-20`]) data[`${rIdx}-112`] = realiseLimo.toFixed(2);\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      'calcul ca detail limonade'
    );

    next = replaceRequired(
      next,
      "        // COUVERTS LIMONADE — 32=NB,33=MOY,34=CUMUL\n        const nbCvtsLimo = parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
      "        // COUVERTS LIMONADE — detail midi/soir + total historique\n        const nbCvtsLimoMidiDetail = parseFloat(data[`${rIdx}-113`] || '0');\n        const nbCvtsLimoSoirDetail = parseFloat(data[`${rIdx}-115`] || '0');\n        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;\n        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimoDetailTotal > 0) data[`${rIdx}-34`] = nbCvtsLimoDetailTotal.toFixed(0);\n        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[`${rIdx}-114`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);\n        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[`${rIdx}-116`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);\n        if (nbCvtsLimo > 0 && realiseLimo > 0) {\n          const totalLimoTm = (realiseLimo / nbCvtsLimo).toFixed(2);\n          data[`${rIdx}-35`] = totalLimoTm;\n          data[`${rIdx}-118`] = totalLimoTm;\n        }\n        if (nbCvtsLimo > 0 || data[`${rIdx}-113`] || data[`${rIdx}-115`] || data[`${rIdx}-34`]) data[`${rIdx}-117`] = nbCvtsLimo.toFixed(0);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
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
