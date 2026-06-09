import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData, type DayDataUber } from '@/contexts/DataContext';

interface UberProps {
  month: number;
  year: number;
  onBack: () => void;
}

const defaultUberData: DayDataUber = { reel: '', commentaire: '' };

const uberConfig: CanalSaisieConfig = {
  title: 'Uber',
  theoriqueLabel: 'Uber Théorique',
  theoriqueField: 'uber',
  realLabel: 'Réel',
  realField: 'reel',
  ecartLabel: 'Écart TTC Uber',
};

export default function Uber({ month, year, onBack }: UberProps) {
  const { data: globalData, updateUber } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.uber || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={uberConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultUberData}
      onUpdate={(day, field, value) => updateUber(month, day, field as keyof DayDataUber, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
