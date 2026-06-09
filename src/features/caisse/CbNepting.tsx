import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData } from '@/contexts/DataContext';

interface CbNeptingProps {
  month: number;
  year: number;
  onBack: () => void;
}

type DayDataCbNeptingLocal = {
  saisie_reel_nepting: number;
  pourboire_sunday: number;
  commentaire: string;
};

const defaultCbNeptingData: DayDataCbNeptingLocal = {
  saisie_reel_nepting: 0,
  pourboire_sunday: 0,
  commentaire: '',
};

const cbNeptingConfig: CanalSaisieConfig = {
  title: 'CB Nepting & Pourboires Sunday',
  theoriqueLabel: 'CB Théorique',
  theoriqueField: 'cb',
  realLabel: 'Saisie Réel Nepting',
  realField: 'saisie_reel_nepting',
  secondaryRealLabel: 'Pourboire Sunday',
  secondaryRealField: 'pourboire_sunday',
  totalLabel: 'Total Nepting (avec pourboire)',
  secondaryTotalLabel: 'Total Pourboire',
  ecartLabel: 'Écart',
  valueAlign: 'center',
};

export default function CbNepting({ month, year, onBack }: CbNeptingProps) {
  const { data: globalData, updateNepting } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.nepting || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={cbNeptingConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultCbNeptingData}
      onUpdate={(day, field, value) => updateNepting(month, day, field as keyof DayDataCbNeptingLocal, value)}
      computeEcart={(reel, theorique, pourboire) => reel - theorique - pourboire}
    />
  );
}
