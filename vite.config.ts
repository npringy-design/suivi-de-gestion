import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { accountingSettingsRoutePatch } from './scripts/accountingSettingsRoutePatch';
import { caisseImportRecoveryPatch } from './scripts/caisseImportRecoveryPatch';
import { dashboardHeaderVisualPatch } from './scripts/dashboardHeaderVisualPatch';
import { dashboardHistoricalBudgetExcelPatch } from './scripts/dashboardHistoricalBudgetExcelPatch';
import { dashboardHistoricalBudgetFocusedPatch } from './scripts/dashboardHistoricalBudgetFocusedPatch';
import { dashboardHistoricalCostMatterImportPatch } from './scripts/dashboardHistoricalCostMatterImportPatch';
import { dashboardHistoricalCostMatterSafePatch } from './scripts/dashboardHistoricalCostMatterSafePatch';
import { dashboardHistoricalPayrollImportPatch } from './scripts/dashboardHistoricalPayrollImportPatch';
import { dashboardHistoricalRealiseImportPatch } from './scripts/dashboardHistoricalRealiseImportPatch';
import { dashboardLimonadeSplitPatch } from './scripts/dashboardLimonadeSplitPatch';
import { dashboardPayrollColumnPatch } from './scripts/dashboardPayrollColumnPatch';
import { dataContextCloudSyncPatch } from './scripts/dataContextCloudSyncPatch';
import { homeHeaderPeriodPatch } from './scripts/homeHeaderPeriodPatch';
import { homePayrollBubblePatch } from './scripts/homePayrollBubblePatch';
import { homeVisualPolishPatch } from './scripts/homeVisualPolishPatch';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const defineValues = { ['process.env.' + 'GEMINI_API_KEY']: JSON.stringify(env.GEMINI_API_KEY) };
  const plugins = [
    dashboardPayrollColumnPatch(), caisseImportRecoveryPatch(),
    dashboardLimonadeSplitPatch(), dashboardHistoricalBudgetExcelPatch(), dashboardHistoricalBudgetFocusedPatch(),
    dashboardHistoricalRealiseImportPatch(), dashboardHistoricalCostMatterImportPatch(), dashboardHistoricalCostMatterSafePatch(),
    dashboardHistoricalPayrollImportPatch(), dashboardHeaderVisualPatch(), dataContextCloudSyncPatch(), homeHeaderPeriodPatch(),
    homePayrollBubblePatch(), homeVisualPolishPatch(), accountingSettingsRoutePatch(),
    react(), tailwindcss()
  ];
  return {
    plugins,
    define: defineValues,
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'recharts-vendor': ['recharts'],
            'lucide-vendor': ['lucide-react'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: { hmr: process.env.DISABLE_HMR !== 'true' },
  };
});
