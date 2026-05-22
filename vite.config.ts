import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { dashboardAnalysisModePatch } from './scripts/dashboardAnalysisModePatch';
import { dashboardCaisseRecapPeriodePatch } from './scripts/dashboardCaisseRecapPeriodePatch';
import { dashboardHeaderVisualPatch } from './scripts/dashboardHeaderVisualPatch';
import { dashboardLimonadeSplitPatch } from './scripts/dashboardLimonadeSplitPatch';
import { dashboardPayrollColumnPatch } from './scripts/dashboardPayrollColumnPatch';
import { dashboardRealiseCleanLayoutPatch } from './scripts/dashboardRealiseCleanLayoutPatch';
import { dashboardRealiseTotalsPatch } from './scripts/dashboardRealiseTotalsPatch';
import { dashboardStrictSalaryRatesPatch } from './scripts/dashboardStrictSalaryRatesPatch';
import { homePayrollBubblePatch } from './scripts/homePayrollBubblePatch';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [dashboardPayrollColumnPatch(), dashboardRealiseTotalsPatch(), dashboardStrictSalaryRatesPatch(), dashboardCaisseRecapPeriodePatch(), dashboardLimonadeSplitPatch(), dashboardRealiseCleanLayoutPatch(), dashboardAnalysisModePatch(), dashboardHeaderVisualPatch(), homePayrollBubblePatch(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
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