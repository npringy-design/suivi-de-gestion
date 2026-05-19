import type { Plugin } from 'vite';

const replaceEveryRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch taux salaires strict non applique : ' + label);
  return code.split(from).join(to);
};

export const dashboardStrictSalaryRatesPatch = (): Plugin => ({
  name: 'dashboard-strict-salary-rates-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceEveryRequired(next, "getAvgRate('cadre', 'cuisine') || 38.54", "getAvgRate('cadre', 'cuisine')", 'cadre cuisine');
    next = replaceEveryRequired(next, "getAvgRate('cadre', 'salle') || 38.54", "getAvgRate('cadre', 'salle')", 'cadre salle');
    next = replaceEveryRequired(next, "getAvgRate('maitrise', 'cuisine') || 20.85", "getAvgRate('maitrise', 'cuisine')", 'maitrise cuisine');
    next = replaceEveryRequired(next, "getAvgRate('maitrise', 'salle') || 20.85", "getAvgRate('maitrise', 'salle')", 'maitrise salle');
    next = replaceEveryRequired(next, "getAvgRate('niv12', 'cuisine') || 16.04", "getAvgRate('niv12', 'cuisine')", 'niv12 cuisine');
    next = replaceEveryRequired(next, "getAvgRate('niv12', 'salle') || 16.04", "getAvgRate('niv12', 'salle')", 'niv12 salle');
    next = replaceEveryRequired(next, "getAvgRate('niv3', 'cuisine') || 18.35", "getAvgRate('niv3', 'cuisine')", 'niv3 cuisine');
    next = replaceEveryRequired(next, "getAvgRate('niv3', 'salle') || 18.35", "getAvgRate('niv3', 'salle')", 'niv3 salle');
    next = replaceEveryRequired(next, "getAvgRate('apprenti', 'cuisine') || 8.39", "getAvgRate('apprenti', 'cuisine')", 'apprenti cuisine');
    next = replaceEveryRequired(next, "getAvgRate('apprenti', 'salle') || 8.39", "getAvgRate('apprenti', 'salle')", 'apprenti salle');

    return { code: next, map: null };
  },
});
