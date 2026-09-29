import type { AnalyseAlertLevel } from '@/types/dataTypes';

export const analyseGlass = 'rounded-2xl border border-cyan-200/20 bg-white/[0.06] shadow-lg shadow-black/20 ring-1 ring-white/10 backdrop-blur-md';

export const analyseLabel = 'text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70';

export const alertText: Record<AnalyseAlertLevel, string> = {
  none: 'text-emerald-300',
  warning: 'text-amber-300',
  critical: 'text-rose-300',
};

export const alertCell: Record<AnalyseAlertLevel, string> = {
  none: '',
  warning: 'bg-amber-400/15 ring-1 ring-inset ring-amber-300/30',
  critical: 'bg-rose-500/20 ring-1 ring-inset ring-rose-300/40',
};
