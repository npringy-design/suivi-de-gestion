import { Target } from 'lucide-react';

import type { CompanySettings } from '@/contexts/DataContext';
import { parseMoneyValue } from '@/lib/money';
import { CARD, CARD_HEADER, CARD_TITLE, INPUT, LABEL } from '@/features/parametres/parametresStyles';

type ObjectifKey = 'productiviteCible' | 'objectifFraisPersonnel' | 'objectifFoodCost';

const FIELDS: { key: ObjectifKey; label: string; unit: string; help: string }[] = [
  { key: 'productiviteCible', label: 'Productivité cible', unit: '€ / h', help: 'CA HT par heure travaillée.' },
  { key: 'objectifFraisPersonnel', label: 'Objectif frais de personnel', unit: '% du CA', help: 'Coût salarial chargé rapporté au CA HT.' },
  { key: 'objectifFoodCost', label: 'Objectif food cost', unit: '% du CA', help: 'Consommation matière rapportée au CA HT total (VAE et limonade comprises).' },
];

// Objectifs du site : affichés dans les en-têtes et le bloc Résultats mensuels du Suivi quotidien.
export default function SectionObjectifs({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (settings: CompanySettings) => void;
}) {
  const update = (key: ObjectifKey, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (key === 'objectifFoodCost') onChange({ ...settings, objectifFoodCost: undefined });
      return;
    }
    onChange({ ...settings, [key]: parseMoneyValue(trimmed) });
  };

  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <Target className="h-4 w-4 text-teal-300" />
        <span className={CARD_TITLE}>Objectifs</span>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
        {FIELDS.map(field => {
          const value = settings[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <div className={LABEL}>{field.label} ({field.unit})</div>
              <input
                className={INPUT}
                inputMode="decimal"
                defaultValue={typeof value === 'number' ? String(value).replace('.', ',') : ''}
                onBlur={e => update(field.key, e.target.value)}
              />
              <p className="text-[10px] text-slate-400">{field.help}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
