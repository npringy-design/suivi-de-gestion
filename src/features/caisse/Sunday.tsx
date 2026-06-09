import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData, type DayDataSunday } from '@/contexts/DataContext';

interface SundayProps {
  month: number;
  year: number;
  onBack: () => void;
}

const defaultSundayData: DayDataSunday = { reel: 0, commentaire: '' };

const sundayConfig: CanalSaisieConfig = {
  title: 'Sunday QR Code + Chèque',
  theoriqueLabel: 'Sunday Théorique',
  theoriqueField: 'sunday',
  realLabel: 'Réel',
  realField: 'reel',
  ecartLabel: 'Écart TTC',
};

export default function Sunday({ month, year, onBack }: SundayProps) {
  const { data: globalData, updateSunday } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.sunday || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={sundayConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultSundayData}
      onUpdate={(day, field, value) => updateSunday(month, day, field as keyof DayDataSunday, value)}
      computeEcart={(reel, theorique) => reel - theorique}
    />
  );
}
