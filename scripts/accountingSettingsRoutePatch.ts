import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch comptable non applique : ' + label);
  return code.replace(from, to);
};

export const accountingSettingsRoutePatch = (): Plugin => ({
  name: 'accounting-settings-route-patch',
  enforce: 'pre',
  transform(code, id) {
    const normalizedId = id.replace(/\\/g, '/');

    if (normalizedId.endsWith('/src/router.tsx')) {
      let next = code;
      next = replaceRequired(
        next,
        "const EdgAnnuelTabs = lazy(() => import('@/EdgAnnuelTabs'));",
        "const EdgAnnuelTabs = lazy(() => import('@/EdgAnnuelTabs'));\nconst ParametrageComptable = lazy(() => import('@/ParametrageComptable'));\nconst ExportComptable = lazy(() => import('@/ExportComptable'));",
        'imports',
      );
      next = replaceRequired(
        next,
        "  {\n    path: '/edg-annuel-tabs',\n    element: <PageRoute Component={EdgAnnuelTabs} backPath='/' />,\n  },",
        "  {\n    path: '/edg-annuel-tabs',\n    element: <PageRoute Component={EdgAnnuelTabs} backPath='/' />,\n  },\n  {\n    path: '/parametrage-comptable',\n    element: <PageRoute Component={ParametrageComptable} backPath='/' />,\n  },\n  {\n    path: '/ecritures-comptables',\n    element: <PageRoute Component={ExportComptable} backPath='/' />,\n  },",
        'routes',
      );
      return { code: next, map: null };
    }

    if (normalizedId.endsWith('/src/Home.tsx')) {
      let next = code;
      next = replaceRequired(
        next,
        "      goToVisuelVacances: () => navigate('/visuel-vacances'),",
        "      goToVisuelVacances: () => navigate('/visuel-vacances'),\n      goToParametrageComptable: () => navigate('/parametrage-comptable'),\n      goToEcrituresComptables: () => navigate('/ecritures-comptables'),",
        'handlers',
      );
      next = replaceRequired(
        next,
        "              <NavItem label=\"Vacances\" onClick={navigationHandlers.goToVisuelVacances} />",
        "              <NavItem label=\"Vacances\" onClick={navigationHandlers.goToVisuelVacances} />\n              <NavItem label=\"Parametrage comptable\" onClick={navigationHandlers.goToParametrageComptable} />\n              <NavItem label=\"Ecritures comptables\" onClick={navigationHandlers.goToEcrituresComptables} />",
        'links',
      );
      return { code: next, map: null };
    }

    return null;
  },
});
