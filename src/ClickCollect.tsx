import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData, type DayDataClickCollect } from '@/contexts/DataContext';

interface ClickCollectProps {
  month: number;
  year: number;
  onBack: () => void;
}

const defaultClickCollectData: DayDataClickCollect = { reel: '', commentaire: '' };

const clickCollectConfig: CanalSaisieConfig = {
  title: 'Click & Collect',
  theoriqueLabel: 'Click Eat Théorique',
  theoriqueField: 'click_collect',
  realLabel: 'Réel',
  realField: 'reel',
  ecartLabel: 'Écart TTC Click Eat',
};

export default function ClickCollect({ month, year, onBack }: ClickCollectProps) {
  const { data: globalData, updateClickCollect } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.clickCollect || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={clickCollectConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultClickCollectData}
      onUpdate={(day, field, value) => updateClickCollect(month, day, field as keyof DayDataClickCollect, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
