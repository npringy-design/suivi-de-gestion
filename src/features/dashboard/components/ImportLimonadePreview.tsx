import { formatDecimal, formatEuroSymbol } from '@/lib/formatters';
import { useHasLimonade } from '@/lib/useHasLimonade';
import type { HistoricalBudgetPreview } from '@/features/dashboard/dashboardTypes';

// Contrôle limonade des aperçus d'import historique (V26 et V25) ; rien pour un site sans limonade.

export function ImportLimonadeRow({ item, color }: { item: HistoricalBudgetPreview; color: string }) {
  const hasLimonade = useHasLimonade();
  if (!hasLimonade) return null;
  return (
    <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 800, color }}>
      Limonade : cts {formatDecimal(item.couvertsLimo, 0)} · TM {formatEuroSymbol(item.tmLimo)} · CA {formatEuroSymbol(item.caLimo)}
      {' '}· réalisé {formatEuroSymbol(item.realiseLimo)} ({formatDecimal(item.realiseCouvertsLimo, 0)} cts)
    </div>
  );
}

export function ImportLimonadeTotals({ items }: { items: HistoricalBudgetPreview[] }) {
  const hasLimonade = useHasLimonade();
  if (!hasLimonade) return null;
  const totals = items.reduce(
    (acc, item) => ({
      budgetCa: acc.budgetCa + item.caLimo,
      budgetCvts: acc.budgetCvts + item.couvertsLimo,
      realiseCa: acc.realiseCa + item.realiseLimo,
      realiseCvts: acc.realiseCvts + item.realiseCouvertsLimo,
    }),
    { budgetCa: 0, budgetCvts: 0, realiseCa: 0, realiseCvts: 0 },
  );
  return (
    <div style={{ marginTop: 3, fontSize: 12, color: '#0e7490', fontWeight: 800 }}>
      Limonade · budget {formatEuroSymbol(totals.budgetCa)} / {formatDecimal(totals.budgetCvts, 0)} cts
      {' '}· réalisé {formatEuroSymbol(totals.realiseCa)} / {formatDecimal(totals.realiseCvts, 0)} cts
    </div>
  );
}
