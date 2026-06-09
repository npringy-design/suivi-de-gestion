import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData, type DayDataAmexAncv } from '@/contexts/DataContext';

interface AmexAncvProps {
  month: number;
  year: number;
  onBack: () => void;
}

const defaultAmexAncvData: DayDataAmexAncv = { reel_nepting: '', commentaire: '' };

const amexAncvConfig: CanalSaisieConfig = {
  title: 'AMEX + ANCV Conecs Réel Nepting',
  theoriqueLabel: 'AMEX / ANCV Théorique',
  theoriqueField: 'amex',
  realLabel: 'Réel Nepting',
  realField: 'reel_nepting',
  totalLabel: 'Total',
  ecartLabel: 'Écart',
};

export default function AmexAncv({ month, year, onBack }: AmexAncvProps) {
  const { data: globalData, updateAmexAncv } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.amexAncv || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={amexAncvConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultAmexAncvData}
      onUpdate={(day, field, value) => updateAmexAncv(month, day, field as keyof DayDataAmexAncv, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
