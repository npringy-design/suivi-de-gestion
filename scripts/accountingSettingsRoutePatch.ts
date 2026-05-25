import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch comptable non applique : ' + label);
  return code.replace(from, to);
};

const replaceFirstAvailable = (code: string, replacements: Array<{ from: string; to: string }>, label: string) => {
  const replacement = replacements.find(item => code.includes(item.from));
  if (!replacement) throw new Error('Patch comptable non applique : ' + label);
  return code.replace(replacement.from, replacement.to);
};

export const accountingSettingsRoutePatch = (): Plugin => ({
  name: 'accounting-settings-route-patch',
  enforce: 'pre',
  transform(code, id) {
    const normalizedId = id.replace(/\\/g, '/');

    if (normalizedId.endsWith('/src/router.tsx')) {
      let next = code;
      if (!next.includes("ParametrageComptable")) {
        next = replaceRequired(
          next,
          "const EdgAnnuelTabs = lazy(() => import('@/EdgAnnuelTabs'));",
          "const EdgAnnuelTabs = lazy(() => import('@/EdgAnnuelTabs'));\nconst ParametrageComptable = lazy(() => import('@/ParametrageComptable'));\nconst ExportComptable = lazy(() => import('@/ExportComptable'));",
          'imports',
        );
      }
      if (!next.includes("/parametrage-comptable")) {
        next = replaceFirstAvailable(
          next,
          [
            {
              from: "  {\n    path: '/edg-annuel-tabs',\n    element: <PageRoute Component={EdgAnnuelTabs} backPath='/' />,\n  },",
              to: "  {\n    path: '/edg-annuel-tabs',\n    element: <PageRoute Component={EdgAnnuelTabs} backPath='/' />,\n  },\n  {\n    path: '/parametrage-comptable',\n    element: <PageRoute Component={ParametrageComptable} backPath='/' />,\n  },\n  {\n    path: '/ecritures-comptables',\n    element: <PageRoute Component={ExportComptable} backPath='/' />,\n  },",
            },
            {
              from: "  { path: '/edg-annuel-tabs', element: <PageRoute Component={EdgAnnuelTabs} backPath='/' /> },",
              to: "  { path: '/edg-annuel-tabs', element: <PageRoute Component={EdgAnnuelTabs} backPath='/' /> },\n  { path: '/parametrage-comptable', element: <PageRoute Component={ParametrageComptable} backPath='/' /> },\n  { path: '/ecritures-comptables', element: <PageRoute Component={ExportComptable} backPath='/' /> },",
            },
          ],
          'routes',
        );
      }
      return { code: next, map: null };
    }

    if (normalizedId.endsWith('/src/Home.tsx')) {
      let next = code;
      if (!next.includes('goToEcrituresComptables')) {
        next = replaceRequired(
          next,
          "      goToVisuelVacances: () => navigate('/visuel-vacances'),",
          "      goToVisuelVacances: () => navigate('/visuel-vacances'),\n      goToEcrituresComptables: () => navigate('/ecritures-comptables'),",
          'handlers',
        );
      }
      if (!next.includes('Ecritures comptables')) {
        next = replaceRequired(
          next,
          "              <NavItem label=\"Vacances\" onClick={navigationHandlers.goToVisuelVacances} />",
          "              <NavItem label=\"Vacances\" onClick={navigationHandlers.goToVisuelVacances} />\n              <NavItem label=\"Ecritures comptables\" onClick={navigationHandlers.goToEcrituresComptables} />",
          'links',
        );
      }
      return { code: next, map: null };
    }

    return null;
  },
});