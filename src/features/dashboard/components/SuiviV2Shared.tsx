import { useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { parseMoneyValue } from '@/lib/money';

// ─── Styles partagés ──────────────────────────────────────────────────────────

export const BG_PAGE = 'linear-gradient(135deg, #07111f 0%, #0a2430 50%, #073d43 100%)';
export const CARD_CLS = 'overflow-hidden rounded-2xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] shadow-lg';
export const LABEL_CLS = 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60';
export const TH_CLS = 'sticky top-0 z-10 bg-[#07111f] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70 border-b border-cyan-200/10 whitespace-nowrap';
export const TD_CLS = 'px-3 py-2 text-right text-xs font-semibold text-amber-50/90 border-b border-cyan-200/5';
export const TD_DAY = 'px-3 py-2 text-left text-xs font-semibold text-amber-50/80 border-b border-cyan-200/5 sticky left-0 bg-[rgba(6,31,40,0.95)]';
export const TD_WEEK = 'px-3 py-2 text-right text-xs font-black text-cyan-200 border-b border-cyan-200/15 bg-[rgba(6,31,40,0.6)]';
export const TD_DAY_WEEK = 'px-3 py-2 text-left text-xs font-black text-cyan-200 border-b border-cyan-200/15 bg-[rgba(6,31,40,0.6)] sticky left-0';

export const fmtPct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
export const fmtNum = (v: number) => Math.round(v).toLocaleString('fr-FR');

export const readComputed = (computed: Record<string, string>, rIdx: number, col: number): number =>
  parseMoneyValue(computed[`${rIdx}-${col}`]);

// ─── Cellule éditable ─────────────────────────────────────────────────────────

export function EditCell({
  value,
  cellKey,
  month,
  onUpdate,
  align = 'right',
}: {
  value: string;
  cellKey: string;
  month: number;
  onUpdate: (month: number, cellKey: string, value: string) => void;
  align?: 'right' | 'left';
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = draft !== null ? draft : (parseMoneyValue(value) > 0 ? fmtNum(parseMoneyValue(value)) : '');

  return (
    <input
      ref={inputRef}
      className={[
        'w-full min-w-[60px] bg-transparent text-xs font-semibold text-amber-50/90 outline-none',
        'border-b border-transparent focus:border-cyan-400/50',
        align === 'right' ? 'text-right' : 'text-left',
      ].join(' ')}
      value={displayed}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onFocus={() => {
        const num = parseMoneyValue(value);
        setDraft(num > 0 ? String(num) : '');
      }}
      onBlur={() => {
        const parsed = parseMoneyValue(draft ?? '');
        onUpdate(month, cellKey, parsed > 0 ? String(parsed) : '');
        setDraft(null);
      }}
      onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); }}
    />
  );
}

// ─── Badge variation ──────────────────────────────────────────────────────────

export function VarBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-cyan-100/30 text-xs">—</span>;
  const pos = pct >= 0;
  return (
    <span className={[
      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black',
      pos ? 'bg-[rgba(52,211,153,0.18)] text-[#6ee7b7]' : 'bg-[rgba(248,113,113,0.2)] text-[#fca5a5]',
    ].join(' ')}>
      {pos ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {fmtPct(pct)}
    </span>
  );
}
