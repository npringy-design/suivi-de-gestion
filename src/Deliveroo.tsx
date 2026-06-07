import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData, type DayDataDeliveroo } from '@/contexts/DataContext';

interface DeliverooProps {
  month: number;
  year: number;
  onBack: () => void;
}

const defaultDeliverooData: DayDataDeliveroo = { reel: '', commentaire: '' };

const deliverooConfig: CanalSaisieConfig = {
  title: 'Deliveroo',
  theoriqueLabel: 'Deliveroo TTC Théorique',
  theoriqueField: 'deliveroo',
  realLabel: 'Réel',
  realField: 'reel',
  ecartLabel: 'Écart TTC Deliveroo',
};

export default function Deliveroo({ month, year, onBack }: DeliverooProps) {
  const { data: globalData, updateDeliveroo } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.deliveroo || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={deliverooConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultDeliverooData}
      onUpdate={(day, field, value) => updateDeliveroo(month, day, field as keyof DayDataDeliveroo, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
