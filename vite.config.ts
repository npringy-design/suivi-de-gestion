import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { accountingSettingsRoutePatch } from './scripts/accountingSettingsRoutePatch';
import { caisseImportRecoveryPatch } from './scripts/caisseImportRecoveryPatch';
import { dashboardAnalysisModePatch } from './scripts/dashboardAnalysisModePatch';
import { dashboardCaisseRecapPeriodePatch } from './scripts/dashboardCaisseRecapPeriodePatch';
import { dashboardHeaderVisualPatch } from './scripts/dashboardHeaderVisualPatch';
import { dashboardHistoricalBudgetExcelPatch } from './scripts/dashboardHistoricalBudgetExcelPatch';
import { dashboardHistoricalBudgetFocusedPatch } from './scripts/dashboardHistoricalBudgetFocusedPatch';
import { dashboardHistoricalRealiseImportPatch } from './scripts/dashboardHistoricalRealiseImportPatch';
import { dashboardLimonadeSplitPatch } from './scripts/dashboardLimonadeSplitPatch';
import { dashboardPayrollColumnPatch } from './scripts/dashboardPayrollColumnPatch';
import { dashboardRealiseCleanLayoutPatch } from './scripts/dashboardRealiseCleanLayoutPatch';
import { dashboardRealiseTotalsPatch } from './scripts/dashboardRealiseTotalsPatch';
import { dashboardStrictSalaryRatesPatch } from './scripts/dashboardStrictSalaryRatesPatch';
import { dashboardThilloisNoLimonadePatch } from './scripts/dashboardThilloisNoLimonadePatch';
import { dashboardVarianceSoftColorsPatch } from './scripts/dashboardVarianceSoftColorsPatch';
import { dataContextCloudSyncPatch } from './scripts/dataContextCloudSyncPatch';
import { homeHeaderPeriodPatch } from './scripts/homeHeaderPeriodPatch';
import { homePayrollBubblePatch } from './scripts/homePayrollBubblePatch';
import { homeSmartPeriodSourcesPatch } from './scripts/homeSmartPeriodSourcesPatch';
import { homeVisualPolishPatch } from './scripts/homeVisualPolishPatch';
import { payrollCpProvisionPatch } from './scripts/payrollCpProvisionPatch';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const defineValues = { ['process.env.' + 'GEMINI_API_KEY']: JSON.stringify(env.GEMINI_API_KEY) };
  return {
    plugins: [payrollCpProvisionPatch(), dashboardPayrollColumnPatch(), dashboardRealiseTotalsPatch(), dashboardStrictSalaryRatesPatch(), dashboardCaisseRecapPeriodePatch(), caisseImportRecoveryPatch(), dashboardLimonadeSplitPatch(), dashboardRealiseCleanLayoutPatch(), dashboardThilloisNoLimonadePatch(), dashboardHistoricalBudgetExcelPatch(), dashboardHistoricalBudgetFocusedPatch(), dashboardHistoricalRealiseImportPatch(), dashboardAnalysisModePatch(), dashboardHeaderVisualPatch(), dashboardVarianceSoftColorsPatch(), dataContextCloudSyncPatch(), homeHeaderPeriodPatch(), homePayrollBubblePatch(), homeVisualPolishPatch(), homeSmartPeriodSourcesPatch(), accountingSettingsRoutePatch(), react(), tailwindcss()],
    define: defineValues,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
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
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});