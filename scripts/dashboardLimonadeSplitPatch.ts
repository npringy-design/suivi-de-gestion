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
      "  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white'],\n  ['REALISE', 'CA HT LIMONADE', 'MIDI', 'bg-[#b4c6e7]'],\n  ['REALISE', 'CA HT LIMONADE', 'SOIR', 'bg-[#b4c6e7]'],\n  ['REALISE', 'CA HT LIMONADE', 'TOTAL LIMO', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS LIMONADE', 'MIDI\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS LIMONADE', 'MIDI\\nMOY', 'bg-white'],\n  ['REALISE', 'COUVERTS LIMONADE', 'SOIR\\nNB CVTS', 'bg-[#b4c6e7]'],\n  ['REALISE', 'COUVERTS LIMONADE', 'SOIR\\nMOY', 'bg-white'],\n  ['REALISE', 'COUVERTS LIMONADE', 'TOTAL LIMO', 'bg-[#b4c6e7]']\n];",
      'colonnes detail limonade'
    );

    next = replaceRequired(
      next,
      "  6, 7, 8, 9, 14, 15, 17, 18, 19, 20, 25, 27, 34, 37, 38, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90",
      "  6, 7, 8, 9, 14, 15, 17, 18, 19, 20, 25, 27, 34, 37, 38, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 112, 113, 115, 117",
      'colonnes editables limonade'
    );

    next = replaceRequired(
      next,
      "        const realiseLimo = parseFloat(data[`${rIdx}-20`] || '0');\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      "        const realiseLimoMidiDetail = parseFloat(data[`${rIdx}-112`] || '0');\n        const realiseLimoSoirDetail = parseFloat(data[`${rIdx}-113`] || '0');\n        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;\n        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseFloat(data[`${rIdx}-20`] || '0');\n        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);\n        if (realiseLimo > 0 || data[`${rIdx}-112`] || data[`${rIdx}-113`] || data[`${rIdx}-20`]) data[`${rIdx}-114`] = realiseLimo.toFixed(2);\n        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;",
      'calcul ca detail limonade'
    );

    next = replaceRequired(
      next,
      "        // COUVERTS LIMONADE — 32=NB,33=MOY,34=CUMUL\n        const nbCvtsLimo = parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
      "        // COUVERTS LIMONADE — detail midi/soir + total historique\n        const nbCvtsLimoMidiDetail = parseFloat(data[`${rIdx}-115`] || '0');\n        const nbCvtsLimoSoirDetail = parseFloat(data[`${rIdx}-117`] || '0');\n        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;\n        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseFloat(data[`${rIdx}-34`] || '0');\n        if (nbCvtsLimoDetailTotal > 0) data[`${rIdx}-34`] = nbCvtsLimoDetailTotal.toFixed(0);\n        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[`${rIdx}-116`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);\n        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[`${rIdx}-118`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);\n        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);\n        if (nbCvtsLimo > 0 || data[`${rIdx}-115`] || data[`${rIdx}-117`] || data[`${rIdx}-34`]) data[`${rIdx}-119`] = nbCvtsLimo.toFixed(0);\n        if (nbCvtsLimo > 0) {\n          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;\n          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);\n        }",
      'calcul couverts detail limonade'
    );

    return { code: next, map: null };
  },
});
