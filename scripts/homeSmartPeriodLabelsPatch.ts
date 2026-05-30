import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch libelles periode accueil non applique : ' + label);
  return code.replace(from, to);
};

export const homeSmartPeriodLabelsPatch = (): Plugin => ({
  name: 'home-smart-period-labels-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    const isDefaultExpr = "homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today)";

    next = replaceRequired(
      next,
      'label="CA Réalisé"',
      `label={${isDefaultExpr} ? 'CA réalisé' : homePeriod.mode === 'month' ? 'CA mois' : homePeriod.mode === 'year' ? 'CA année' : homePeriod.mode === 'day' ? 'CA sélection' : 'CA période'}`,
      'libelle ca principal'
    );

    next = replaceRequired(
      next,
      'label="CA veille"',
      `label={${isDefaultExpr} ? 'CA veille' : homePeriod.mode === 'year' ? 'CA moy. / mois' : homePeriod.mode === 'day' ? 'CA resto jour' : 'CA moy. / jour'}`,
      'libelle ca secondaire'
    );

    next = replaceRequired(
      next,
      'label="TM veille"',
      `label={${isDefaultExpr} ? 'TM veille' : homePeriod.mode === 'month' ? 'TM mois' : homePeriod.mode === 'year' ? 'TM année' : homePeriod.mode === 'day' ? 'TM sélection' : 'TM période'}`,
      'libelle ticket moyen'
    );

    next = replaceRequired(
      next,
      'label="Réalisation Budget"',
      `label={${isDefaultExpr} ? 'Réalisation Budget' : homePeriod.mode === 'month' ? 'Budget mois' : homePeriod.mode === 'year' ? 'Budget année' : homePeriod.mode === 'day' ? 'Budget jour' : 'Budget période'}`,
      'libelle budget'
    );

    next = replaceRequired(
      next,
      '<p className="home-chart-subtitle text-xs text-slate-500">Réalisé vs Budget mensuel</p>',
      `<p className="home-chart-subtitle text-xs text-slate-500">{${isDefaultExpr} ? 'Réalisé vs Budget mensuel' : homePeriod.mode === 'month' ? 'Réalisé vs Budget du mois sélectionné' : homePeriod.mode === 'year' ? 'Réalisé vs Budget annuel' : homePeriod.mode === 'day' ? 'Réalisé vs Budget du jour sélectionné' : 'Réalisé vs Budget de la période sélectionnée'}</p>`,
      'sous titre graphique ca'
    );

    return { code: next, map: null };
  },
});
