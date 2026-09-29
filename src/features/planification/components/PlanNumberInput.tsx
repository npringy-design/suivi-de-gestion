import { useEffect, useState } from 'react';

type PlanNumberInputProps = {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
  step?: number;
  allowEmpty?: boolean;
  highlight?: boolean;
  className?: string;
  ariaLabel: string;
};

const toText = (value: number | null): string => (value === null ? '' : String(value));

// Saisie validée à la sortie du champ (blur / Entrée) : pas de recalcul du plan à chaque frappe.
export default function PlanNumberInput({
  value, onCommit, placeholder, step = 1, allowEmpty = false, highlight = false, className = '', ariaLabel,
}: PlanNumberInputProps) {
  const [text, setText] = useState(toText(value));
  useEffect(() => setText(toText(value)), [value]);

  const commit = () => {
    const trimmed = text.trim().replace(',', '.');
    if (trimmed === '') {
      if (allowEmpty) onCommit(null); else setText(toText(value));
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) onCommit(parsed); else setText(toText(value));
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onChange={event => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      className={`w-full min-w-[3.5rem] rounded-md border bg-white/[0.06] px-1.5 py-1 text-right text-xs font-bold text-white outline-none focus:border-cyan-300 ${highlight ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-white/10'} ${className}`}
    />
  );
}
