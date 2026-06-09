import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData } from '@/contexts/DataContext';

interface ConecsProps {
  month: number;
  year: number;
  onBack: () => void;
}

type DayDataConecsLocal = {
  conecs_reel_nepting: number;
  commentaire: string;
};

const defaultConecsData: DayDataConecsLocal = { conecs_reel_nepting: 0, commentaire: '' };

const conecsConfig: CanalSaisieConfig = {
  title: 'Carte TR Conecs',
  theoriqueLabel: 'Conecs Théorique',
  theoriqueField: 'tr_carte',
  realLabel: 'Conecs Réel Nepting',
  realField: 'conecs_reel_nepting',
  totalLabel: 'Total Conecs',
  ecartLabel: 'Écart',
  valueAlign: 'center',
};

export default function Conecs({ month, year, onBack }: ConecsProps) {
  const { data: globalData, updateConecs } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.conecs || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={conecsConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultConecsData}
      onUpdate={(day, field, value) => updateConecs(month, day, field as keyof DayDataConecsLocal, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
