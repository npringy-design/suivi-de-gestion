import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch branchement analyse non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardAnalysisModePatch = (): Plugin => ({
  name: 'dashboard-analysis-mode-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "import React, { useState, useMemo, useEffect, useRef } from 'react';",
      "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport DashboardAnalysisView from '@/DashboardAnalysisView';",
      'import analyse'
    );

    next = replaceRequired(
      next,
      "            renderDailyEntryView()\n          ) : (",
      "            renderDailyEntryView()\n          ) : tableViewMode === 'ANALYSE' ? (\n            React.createElement(DashboardAnalysisView, { rows, calculatedData, salariesConfig: globalData[month]?.salariesConfig?.categories, isMobile })\n          ) : (",
      'rendu analyse'
    );

    return { code: next, map: null };
  },
});
