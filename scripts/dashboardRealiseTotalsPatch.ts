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
      '[7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92, 117, 122]',
      'exclusion moyennes et cumuls'
    );

    next = replaceOneRequired(
      next,
      "        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);\n        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);\n        // Cout matiere semaine",
      "        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);\n        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);\n        const budgetCaW = parseFloat(data[`${rIdx}-3`] || '0');\n        if (budgetCaW > 0 || realiseCAW > 0) {\n          const ecartCaBudgetW = realiseCAW - budgetCaW;\n          data[`${rIdx}-22`] = ecartCaBudgetW.toFixed(2);\n          if (budgetCaW > 0) data[`${rIdx}-117`] = ((ecartCaBudgetW / budgetCaW) * 100).toFixed(2);\n        }\n        const totalCvtsRealiseW = nbMidiW + nbSoirW;\n        if (totalCvtsRealiseW > 0) {\n          const moyJourRealiseW = (caMidiWr + caSoirWr) / totalCvtsRealiseW;\n          data[`${rIdx}-29`] = totalCvtsRealiseW.toFixed(0);\n          data[`${rIdx}-30`] = moyJourRealiseW.toFixed(2);\n          const budgetMoyJourW = parseFloat(data[`${rIdx}-11`] || '0');\n          if (budgetMoyJourW > 0) data[`${rIdx}-31`] = (moyJourRealiseW - budgetMoyJourW).toFixed(2);\n          const lastWeekDay = weekDays[weekDays.length - 1];\n          if (lastWeekDay) data[`${rIdx}-32`] = data[`${lastWeekDay.originalIdx}-32`] || totalCvtsRealiseW.toFixed(0);\n          const budgetCvtsW = parseFloat(data[`${rIdx}-10`] || '0') + parseFloat(data[`${rIdx}-14`] || '0');\n          const ecartCvtsW = parseFloat(data[`${rIdx}-33`] || '0');\n          if (budgetCvtsW > 0) data[`${rIdx}-122`] = ((ecartCvtsW / budgetCvtsW) * 100).toFixed(2);\n        }\n        // Cout matiere semaine",
      'moyenne semaine'
    );

    next = replaceOneRequired(
      next,
      "      const totalCvtsM = nbMidiM + nbSoirM;\n      if (totalCvtsM > 0) data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);",
      "      const budgetCaM = parseFloat(data[`${monthTotalIdx}-3`] || '0');\n      if (budgetCaM > 0 || realiseCAM > 0) {\n        const ecartCaBudgetM = realiseCAM - budgetCaM;\n        data[`${monthTotalIdx}-22`] = ecartCaBudgetM.toFixed(2);\n        if (budgetCaM > 0) data[`${monthTotalIdx}-117`] = ((ecartCaBudgetM / budgetCaM) * 100).toFixed(2);\n      }\n      const totalCvtsM = nbMidiM + nbSoirM;\n      if (totalCvtsM > 0) {\n        const moyJourRealiseM = (caMidiMr + caSoirMr) / totalCvtsM;\n        data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);\n        data[`${monthTotalIdx}-30`] = moyJourRealiseM.toFixed(2);\n        data[`${monthTotalIdx}-32`] = totalCvtsM.toFixed(0);\n        const budgetMoyJourM = parseFloat(data[`${monthTotalIdx}-11`] || '0');\n        if (budgetMoyJourM > 0) data[`${monthTotalIdx}-31`] = (moyJourRealiseM - budgetMoyJourM).toFixed(2);\n        const budgetCvtsM = parseFloat(data[`${monthTotalIdx}-10`] || '0') + parseFloat(data[`${monthTotalIdx}-14`] || '0');\n        const ecartCvtsM = parseFloat(data[`${monthTotalIdx}-33`] || '0');\n        if (budgetCvtsM > 0) data[`${monthTotalIdx}-122`] = ((ecartCvtsM / budgetCvtsM) * 100).toFixed(2);\n      }",
      'moyenne mois'
    );

    return { code: next, map: null };
  },
});