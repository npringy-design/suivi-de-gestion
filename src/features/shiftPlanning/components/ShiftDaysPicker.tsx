// Boutons L à D ; valeur = getDay() (0 = dimanche).
const DAYS: Array<{ label: string; value: number }> = [
  { label: 'L', value: 1 }, { label: 'M', value: 2 }, { label: 'M', value: 3 }, { label: 'J', value: 4 },
  { label: 'V', value: 5 }, { label: 'S', value: 6 }, { label: 'D', value: 0 },
];

type Props = { days: number[]; onChange: (days: number[]) => void; label: string };

export default function ShiftDaysPicker({ days, onChange, label }: Props) {
  const toggle = (value: number) => onChange(days.includes(value) ? days.filter(d => d !== value) : [...days, value]);
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {DAYS.map(day => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggle(day.value)}
          aria-pressed={days.includes(day.value)}
          className={`h-7 w-7 rounded-md text-xs font-bold ${days.includes(day.value) ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
