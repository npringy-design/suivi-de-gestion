import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { dashboardHistoricalBudgetExcelPatch } from './scripts/dashboardHistoricalBudgetExcelPatch';
import { dashboardHistoricalBudgetFocusedPatch } from './scripts/dashboardHistoricalBudgetFocusedPatch';
import { dashboardHistoricalPayrollImportPatch } from './scripts/dashboardHistoricalPayrollImportPatch';
import { dashboardHistoricalRealiseImportPatch } from './scripts/dashboardHistoricalRealiseImportPatch';
import { dashboardPayrollColumnPatch } from './scripts/dashboardPayrollColumnPatch';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const defineValues = { ['process.env.' + 'GEMINI_API_KEY']: JSON.stringify(env.GEMINI_API_KEY) };
  const plugins = [
    dashboardPayrollColumnPatch(),
    dashboardHistoricalBudgetExcelPatch(), dashboardHistoricalBudgetFocusedPatch(),
    dashboardHistoricalRealiseImportPatch(),
    dashboardHistoricalPayrollImportPatch(),
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
