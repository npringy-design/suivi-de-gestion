import type { Plugin } from 'vite';

const replaceAllRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch totaux realises non applique : ' + label);
  return code.split(from).join(to);
};

const replaceOneRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch totaux realises non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardRealiseTotalsPatch = (): Plugin => ({
  name: 'dashboard-realise-totals-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;

    let next = code;

    next = replaceAllRequired(
      next,
      '[7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 35, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92]',
      '[7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92]',
      'exclusion moyennes et cumuls'
    );

    next = replaceOneRequired(
      next,
      "        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);\n        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);\n        // Cout matiere semaine",
      "        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);\n        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);\n        const totalCvtsRealiseW = nbMidiW + nbSoirW;\n        if (totalCvtsRealiseW > 0) {\n          const moyJourRealiseW = (caMidiWr + caSoirWr) / totalCvtsRealiseW;\n          data[`${rIdx}-29`] = totalCvtsRealiseW.toFixed(0);\n          data[`${rIdx}-30`] = moyJourRealiseW.toFixed(2);\n          const budgetMoyJourW = parseFloat(data[`${rIdx}-11`] || '0');\n          if (budgetMoyJourW > 0) data[`${rIdx}-31`] = (moyJourRealiseW - budgetMoyJourW).toFixed(2);\n          const lastWeekDay = weekDays[weekDays.length - 1];\n          if (lastWeekDay) data[`${rIdx}-32`] = data[`${lastWeekDay.originalIdx}-32`] || totalCvtsRealiseW.toFixed(0);\n        }\n        // Cout matiere semaine",
      'moyenne semaine'
    );

    next = replaceOneRequired(
      next,
      "      const totalCvtsM = nbMidiM + nbSoirM;\n      if (totalCvtsM > 0) data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);",
      "      const totalCvtsM = nbMidiM + nbSoirM;\n      if (totalCvtsM > 0) {\n        const moyJourRealiseM = (caMidiMr + caSoirMr) / totalCvtsM;\n        data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);\n        data[`${monthTotalIdx}-30`] = moyJourRealiseM.toFixed(2);\n        data[`${monthTotalIdx}-32`] = totalCvtsM.toFixed(0);\n        const budgetMoyJourM = parseFloat(data[`${monthTotalIdx}-11`] || '0');\n        if (budgetMoyJourM > 0) data[`${monthTotalIdx}-31`] = (moyJourRealiseM - budgetMoyJourM).toFixed(2);\n      }",
      'moyenne mois'
    );

    return { code: next, map: null };
  },
});