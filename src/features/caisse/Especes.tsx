import CanalSaisie, { type CanalSaisieConfig } from '@/components/CanalSaisie';
import { useData } from '@/contexts/DataContext';

interface EspecesProps {
  month: number;
  year: number;
  onBack: () => void;
}

type DayDataEspecesLocal = {
  mis_au_coffre: number;
  pieces: number;
  commentaire: string;
};

const defaultEspecesData: DayDataEspecesLocal = {
  mis_au_coffre: 0,
  pieces: 0,
  commentaire: '',
};

const especesConfig: CanalSaisieConfig = {
  title: 'Espèces',
  theoriqueLabel: 'Espèces Théorique',
  theoriqueField: 'especes',
  realLabel: 'Mis au Coffre',
  realField: 'mis_au_coffre',
  secondaryRealLabel: 'Pièces',
  secondaryRealField: 'pieces',
  ecartLabel: 'Écart',
  valueAlign: 'center',
};

export default function Especes({ month, year, onBack }: EspecesProps) {
  const { data: globalData, updateEspeces } = useData();
  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.especes || {};

  return (
    <CanalSaisie
      month={month}
      year={year}
      onBack={onBack}
      config={especesConfig}
      theoriqueData={theoriqueData}
      getData={(day) => data[day] || defaultEspecesData}
      onUpdate={(day, field, value) => updateEspeces(month, day, field as keyof DayDataEspecesLocal, value)}
      computeEcart={(misAuCoffre, theorique, pieces) => misAuCoffre + pieces - theorique}
    />
  );
}
