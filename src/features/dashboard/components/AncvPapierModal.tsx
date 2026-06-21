import React from 'react';

import type { AncvEntry, DayDataAncvPapiers } from '@/contexts/DataContext';
import { parseMoneyValue, formatCurrencyFr, sanitizeMoneyInput } from '@/lib/money';

interface AncvPapierModalProps {
  day: number;
  month: number;
  ancv: DayDataAncvPapiers | undefined;
  updateAncvLigne: (month: number, day: number, index: number, field: keyof AncvEntry, value: string) => void;
  onClose: () => void;
}

const NUM_ROWS = 8;

const CurrencyInput = ({ value, onChange }: { value: string | number; onChange: (val: string) => void }) => {
  const [draft, setDraft] = React.useState<string | null>(null);
  const isFocused = draft !== null;
  const strValue = typeof value === 'number' ? (value !== 0 ? String(value) : '') : (value ?? '');
  const displayValue = isFocused ? draft! : (strValue ? formatCurrencyFr(strValue) : '');
  return (
    <input
      type="text"
      className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-right text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
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
    className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-center text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
    value={value}
    onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
  />
);

export default function AncvPapierModal({ day, month, ancv, updateAncvLigne, onClose }: AncvPapierModalProps) {
  const getEntries = (): AncvEntry[] => {
    const existing = ancv?.lignes ?? [];
    const result: AncvEntry[] = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      result.push(existing[i] ?? { valeur: 0, nombre: '' });
    }
    return result;
  };

  const entries = getEntries();

  const total = entries.reduce(
    (acc, e) => {
      const nb = parseMoneyValue(e.nombre);
      return { nombre: acc.nombre + nb, montant: acc.montant + (e.valeur ?? 0) * nb };
    },
    { nombre: 0, montant: 0 }
  );

  const dateLabel = new Date(new Date().getFullYear(), month, day).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
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
        <div style={{ padding: '16px 20px' }}>
          <div className="rounded-lg bg-blue-50/40 p-3">
            <div className="text-xs font-bold uppercase tracking-wider mb-3 text-center text-blue-700">ANCV</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px auto', gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Valeur faciale</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Nombre</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', minWidth: 60 }}>Sous-total</div>
            </div>
            {entries.map((entry, i) => {
              const lineTotal = (entry.valeur ?? 0) * parseMoneyValue(entry.nombre);
              return (
                <div key={i} style={{ marginBottom: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px auto', gap: 4, alignItems: 'center' }}>
                    <CurrencyInput
                      value={entry.valeur || ''}
                      onChange={val => updateAncvLigne(month, day, i, 'valeur', val)}
                    />
                    <NumberInput
                      value={entry.nombre || ''}
                      onChange={val => updateAncvLigne(month, day, i, 'nombre', val)}
                    />
                    <div style={{ fontSize: 10, color: lineTotal > 0 ? '#1d4ed8' : '#cbd5e1', textAlign: 'right', minWidth: 60, fontWeight: lineTotal > 0 ? 700 : 400 }}>
                      {lineTotal > 0 ? `${formatCurrencyFr(lineTotal)} €` : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
            {total.montant > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #bfdbfe', fontSize: 11, fontWeight: 800, color: '#1d4ed8', textAlign: 'right' }}>
                {formatCurrencyFr(total.montant)} €
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ margin: '0 20px 16px', padding: '10px 16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '.04em' }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#c2410c', marginTop: 2 }}>
              {total.nombre > 0 ? `${total.nombre} ANCV` : '—'}
              {total.montant > 0 ? ` · ${formatCurrencyFr(total.montant)} €` : ''}
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
