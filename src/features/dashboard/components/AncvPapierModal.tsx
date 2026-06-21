import React from 'react';

import type { DayDataAncvPapiers } from '@/contexts/DataContext';
import { parseMoneyValue, formatCurrencyFr, sanitizeMoneyInput } from '@/lib/money';

interface AncvPapierModalProps {
  day: number;
  month: number;
  ancv: DayDataAncvPapiers | undefined;
  updateAncvPapiers: (month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => void;
  onClose: () => void;
}

const CurrencyInput = ({ value, onChange }: { value: string | number; onChange: (val: string) => void }) => {
  const [draft, setDraft] = React.useState<string | null>(null);
  const isFocused = draft !== null;
  const strValue = typeof value === 'number' ? (value !== 0 ? String(value) : '') : (value ?? '');
  const displayValue = isFocused ? draft! : (strValue ? formatCurrencyFr(strValue) : '');
  return (
    <input
      type="text"
      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-right text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
      value={displayValue}
      onChange={e => {
        const sanitized = sanitizeMoneyInput(e.target.value);
        setDraft(sanitized);
        onChange(sanitized);
      }}
      onFocus={() => setDraft(strValue)}
      onBlur={() => setDraft(null)}
    />
  );
};

const NumberInput = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
  <input
    type="text"
    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-center text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
    value={value}
    onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
  />
);

export default function AncvPapierModal({ day, month, ancv, updateAncvPapiers, onClose }: AncvPapierModalProps) {
  const montantTotal = ancv?.montant_total ?? 0;
  const nombreAncv = ancv?.nombre_ancv ?? '';

  const dateLabel = new Date(new Date().getFullYear(), month, day).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>ANCV Papier</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>{dateLabel}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div className="bg-blue-50/40 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Montant total</div>
              <CurrencyInput
                value={montantTotal}
                onChange={val => updateAncvPapiers(month, day, 'montant_total', val)}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Nombre ANCV</div>
              <NumberInput
                value={nombreAncv}
                onChange={val => updateAncvPapiers(month, day, 'nombre_ancv', val)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ margin: '0 20px 16px', padding: '10px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Récapitulatif</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>
              {parseMoneyValue(nombreAncv) > 0 ? `${nombreAncv} ANCV` : '—'}
              {montantTotal > 0 ? ` · ${formatCurrencyFr(montantTotal)} €` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', borderRadius: 8, background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: '9px 20px' }}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
