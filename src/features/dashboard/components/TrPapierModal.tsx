import React from 'react';

import type { DayDataSaisieTR, TrEntry } from '@/contexts/DataContext';
import { parseMoneyValue, formatCurrencyFr, sanitizeMoneyInput } from '@/lib/money';

interface TrPapierModalProps {
  day: number;
  month: number;
  trData: DayDataSaisieTR | undefined;
  updateSaisieTR: (month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => void;
  onClose: () => void;
}

const PROVIDERS: { key: keyof DayDataSaisieTR; label: string; bg: string; headerColor: string }[] = [
  { key: 'edenred', label: 'Edenred', bg: 'bg-amber-50/40', headerColor: 'text-amber-700' },
  { key: 'bimpli', label: 'Bimpli', bg: 'bg-emerald-50/40', headerColor: 'text-emerald-700' },
  { key: 'pluxee', label: 'Pluxee', bg: 'bg-blue-50/40', headerColor: 'text-blue-700' },
  { key: 'up', label: 'Up', bg: 'bg-slate-50/60', headerColor: 'text-slate-700' },
];

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

export default function TrPapierModal({ day, month, trData, updateSaisieTR, onClose }: TrPapierModalProps) {
  const ROWS = 8;

  const getEntries = (key: keyof DayDataSaisieTR): TrEntry[] => {
    const entries = trData?.[key] ?? [];
    const result: TrEntry[] = [];
    for (let i = 0; i < ROWS; i++) {
      result.push(entries[i] ?? { valeur: 0, nombre: '' });
    }
    return result;
  };

  const colTotal = (key: keyof DayDataSaisieTR) =>
    getEntries(key).reduce((sum, e) => sum + (e.valeur ?? 0) * parseMoneyValue(e.nombre), 0);

  const totalMontant = PROVIDERS.reduce((sum, p) => sum + colTotal(p.key), 0);
  const totalNombre = PROVIDERS.reduce((sum, p) =>
    sum + getEntries(p.key).reduce((s, e) => s + parseMoneyValue(e.nombre), 0), 0);

  const dateLabel = new Date(new Date().getFullYear(), month, day).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>TR Papier</div>
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
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {PROVIDERS.map(({ key, label, bg, headerColor }) => {
            const entries = getEntries(key);
            return (
              <div key={key} className={`rounded-lg ${bg} p-3`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-3 text-center ${headerColor}`}>{label}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <div style={{ flex: 1, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Valeur</div>
                  <div style={{ width: 44, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Nb</div>
                </div>
                {entries.map((entry, i) => {
                  const lineTotal = (entry.valeur ?? 0) * parseMoneyValue(entry.nombre);
                  return (
                    <div key={i} style={{ marginBottom: 3 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <CurrencyInput
                            value={entry.valeur || ''}
                            onChange={val => updateSaisieTR(month, day, key, i, 'valeur', val)}
                          />
                        </div>
                        <div style={{ width: 44 }}>
                          <NumberInput
                            value={entry.nombre || ''}
                            onChange={val => updateSaisieTR(month, day, key, i, 'nombre', val)}
                          />
                        </div>
                      </div>
                      {lineTotal > 0 && (
                        <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'right', marginTop: 1 }}>
                          = {formatCurrencyFr(lineTotal)} €
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTotal(key) > 0 && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e2e8f0', fontSize: 11, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                    {formatCurrencyFr(colTotal(key))} €
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ margin: '0 20px 16px', padding: '10px 16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '.04em' }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#c2410c', marginTop: 2 }}>
              {totalNombre > 0 ? `${totalNombre} TR` : '—'}
              {totalMontant > 0 ? ` · ${formatCurrencyFr(totalMontant)} €` : ''}
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
