import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch accueil periode non applique : ' + label);
  return code.replace(from, to);
};

const periodHelpersInsertionPoint = `const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);`;

const periodHelpersReplacement = `const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);

type HomePeriodMode = 'day' | 'range' | 'month' | 'year';

type HomePeriodSelection = {
  mode: HomePeriodMode;
  start: string;
  end: string;
};

const periodModeLabels: Record<HomePeriodMode, string> = {
  day: 'Jour',
  range: 'Période',
  month: 'Mois entier',
  year: 'Année entière',
};

const toDateInputValue = (date: Date) => {
  const yearValue = String(date.getFullYear());
  const monthValue = String(date.getMonth() + 1).padStart(2, '0');
  const dayValue = String(date.getDate()).padStart(2, '0');
  return [yearValue, monthValue, dayValue].join('-');
};

const makeLocalDate = (value: string) => {
  const [yearValue, monthValue, dayValue] = value.split('-').map(part => Number.parseInt(part, 10));
  if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !Number.isFinite(dayValue)) return new Date();
  return new Date(yearValue, monthValue - 1, dayValue);
};

const formatShortPeriodDate = (date: Date) =>
  date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatHomePeriodLabel = (period: HomePeriodSelection) => {
  const start = makeLocalDate(period.start);
  const end = makeLocalDate(period.end);

  if (period.mode === 'day') return formatShortPeriodDate(start);
  if (period.mode === 'month') {
    const formatted = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  if (period.mode === 'year') return String(start.getFullYear());
  return formatShortPeriodDate(start) + ' au ' + formatShortPeriodDate(end);
};`;

const stateSource = `  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [weeklyForecast, setWeeklyForecast] = useState<Array<{ date: string; code: number; tempMin: number; tempMax: number; rain: number }>>([]);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [dayEvent, setDayEvent] = useState('Fête du jour');`;

const stateReplacement = `  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [weeklyForecast, setWeeklyForecast] = useState<Array<{ date: string; code: number; tempMin: number; tempMax: number; rain: number }>>([]);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [dayEvent, setDayEvent] = useState('Fête du jour');
  const [homePeriod, setHomePeriod] = useState<HomePeriodSelection>(() => {
    const now = new Date();
    const safeDay = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() ? now.getDate() : 1;
    const current = toDateInputValue(new Date(selectedYear, selectedMonth, safeDay));
    return { mode: 'day', start: current, end: current };
  });
  const [periodMode, setPeriodMode] = useState<HomePeriodMode>('day');
  const [periodDay, setPeriodDay] = useState(() => homePeriod.start);
  const [periodStart, setPeriodStart] = useState(() => homePeriod.start);
  const [periodEnd, setPeriodEnd] = useState(() => homePeriod.end);
  const [periodMonth, setPeriodMonth] = useState(() => String(selectedYear) + '-' + String(selectedMonth + 1).padStart(2, '0'));
  const [periodYear, setPeriodYear] = useState(() => String(selectedYear));`;

const gridSource = `                <div className="relative grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(170px,230px)_auto] lg:items-center">`;

const gridReplacement = `                <div className="relative grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">`;

const titleSource = `                    <h1 className="home-title font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Au Bureau
                    </h1>
                    <div className="home-separator mt-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mt-1.5 max-w-[360px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Montévrain
                    </div>`;

const titleReplacement = `                    <h1 className="home-title font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Hippopotamus
                    </h1>
                    <div className="home-separator mt-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mt-1.5 max-w-[360px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Thillois
                    </div>`;

const periodPanelSource = `
                  <div className="home-period-panel grid grid-cols-2 gap-2 rounded-2xl border border-cyan-100/25 bg-[#052a34]/72 p-2 shadow-lg shadow-black/20 ring-1 ring-white/10 backdrop-blur-sm lg:grid-cols-1">
                    <select
                      value={month}
                      onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                      className="h-9 rounded-xl border border-cyan-100/15 bg-[#0a3a45]/95 px-3 text-sm font-extrabold text-cyan-50 shadow-inner outline-none transition-all focus:ring-2 focus:ring-cyan-300/35"
                    >
                      {months.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={e => setSelectedYear(parseInt(e.target.value))}
                      className="h-9 rounded-xl border border-cyan-100/15 bg-[#0a3a45]/95 px-3 text-sm font-extrabold text-cyan-50 shadow-inner outline-none transition-all focus:ring-2 focus:ring-cyan-300/35"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
`;

const periodPanelReplacement = `
`;

const weatherUrlSource = `'https://api.open-meteo.com/v1/forecast?latitude=48.8755&longitude=2.7467&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis&forecast_days=7'`;

const weatherUrlReplacement = `'https://api.open-meteo.com/v1/forecast?latitude=49.2567&longitude=3.955&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis&forecast_days=7'`;

const periodCallbacksInsertionPoint = `  const getDayEvent = (date: Date) => {`;

const periodCallbacksReplacement = `  const selectedPeriodLabel = useMemo(() => formatHomePeriodLabel(homePeriod), [homePeriod]);
  const selectedPeriodDescription = periodModeLabels[homePeriod.mode];

  const openPeriodModal = useCallback(() => {
    const start = makeLocalDate(homePeriod.start);
    setPeriodMode(homePeriod.mode);
    setPeriodDay(homePeriod.start);
    setPeriodStart(homePeriod.start);
    setPeriodEnd(homePeriod.end);
    setPeriodMonth(String(start.getFullYear()) + '-' + String(start.getMonth() + 1).padStart(2, '0'));
    setPeriodYear(String(start.getFullYear()));
    setIsPeriodModalOpen(true);
  }, [homePeriod]);

  const applyPeriodSelection = useCallback(() => {
    let nextStart = makeLocalDate(periodDay);
    let nextEnd = makeLocalDate(periodDay);

    if (periodMode === 'range') {
      nextStart = makeLocalDate(periodStart);
      nextEnd = makeLocalDate(periodEnd);
    }

    if (periodMode === 'month') {
      const [yearValue, monthValue] = periodMonth.split('-').map(part => Number.parseInt(part, 10));
      const safeYear = Number.isFinite(yearValue) ? yearValue : selectedYear;
      const safeMonth = Number.isFinite(monthValue) ? monthValue - 1 : selectedMonth;
      nextStart = new Date(safeYear, safeMonth, 1);
      nextEnd = new Date(safeYear, safeMonth + 1, 0);
    }

    if (periodMode === 'year') {
      const safeYear = Number.parseInt(periodYear, 10);
      const finalYear = Number.isFinite(safeYear) ? safeYear : selectedYear;
      nextStart = new Date(finalYear, 0, 1);
      nextEnd = new Date(finalYear, 11, 31);
    }

    if (nextEnd.getTime() < nextStart.getTime()) {
      const previousStart = nextStart;
      nextStart = nextEnd;
      nextEnd = previousStart;
    }

    setSelectedYear(nextStart.getFullYear());
    setSelectedMonth(nextStart.getMonth());
    setHomePeriod({
      mode: periodMode,
      start: toDateInputValue(nextStart),
      end: toDateInputValue(nextEnd),
    });
    setIsPeriodModalOpen(false);
  }, [periodDay, periodEnd, periodMode, periodMonth, periodStart, periodYear, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear]);

  const getDayEvent = (date: Date) => {`;

const dateTileSource = `                      <div className="home-date-tile relative min-h-[72px] overflow-hidden rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#06313b] via-[#0b5f65] to-[#16847d] px-3 py-1.5 shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[clamp(215px,18vw,265px)]">
                        <div className="absolute inset-x-0 bottom-0 h-7 bg-cyan-950/20" />
                        <div className="relative flex h-full items-center gap-3">
                          <div className="home-date-calendar relative flex h-[52px] w-[42px] shrink-0 flex-col overflow-hidden rounded-lg bg-amber-50/95 shadow-md ring-1 ring-cyan-100/30">
                            <div className="h-3.5 bg-teal-800" />
                            <div className="absolute left-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="absolute right-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="flex flex-1 items-center justify-center text-[22px] font-black text-slate-950">
                              {today.getDate()}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[13px] font-black text-amber-50 sm:text-[14px]">
                              <Calendar className="h-4 w-4 shrink-0 text-amber-200" />
                              <span className="truncate">{formatDateFr(today)}</span>
                            </div>
                            <div className="my-1 h-px bg-cyan-100/25" />
                            <div className="truncate text-[12px] font-extrabold text-cyan-50/80 sm:text-[13px]">
                              {dayEvent}
                            </div>
                          </div>
                        </div>
                      </div>`;

const dateTileReplacement = `                      <button
                        type="button"
                        onClick={openPeriodModal}
                        className="home-date-tile relative min-h-[72px] overflow-hidden rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#06313b] via-[#0b5f65] to-[#16847d] px-3 py-1.5 text-left shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:border-amber-100/45 hover:shadow-amber-950/20 sm:min-w-[clamp(245px,20vw,305px)]"
                        aria-label="Ouvrir le calendrier de sélection"
                      >
                        <div className="absolute inset-x-0 bottom-0 h-7 bg-cyan-950/20" />
                        <div className="relative flex h-full items-center gap-3">
                          <div className="home-date-calendar relative flex h-[52px] w-[42px] shrink-0 flex-col overflow-hidden rounded-lg bg-amber-50/95 shadow-md ring-1 ring-cyan-100/30">
                            <div className="h-3.5 bg-teal-800" />
                            <div className="absolute left-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="absolute right-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="flex flex-1 items-center justify-center text-[22px] font-black text-slate-950">
                              {today.getDate()}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[13px] font-black text-amber-50 sm:text-[14px]">
                              <Calendar className="h-4 w-4 shrink-0 text-amber-200" />
                              <span className="truncate">{formatDateFr(today)}</span>
                            </div>
                            <div className="my-1 h-px bg-cyan-100/25" />
                            <div className="truncate text-[12px] font-extrabold text-cyan-50/80 sm:text-[13px]">
                              {dayEvent}
                            </div>
                            <div className="mt-1 truncate rounded-lg bg-cyan-950/25 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-[0.08em] text-amber-100/90 ring-1 ring-cyan-100/10">
                              {selectedPeriodDescription} · {selectedPeriodLabel}
                            </div>
                          </div>
                        </div>
                      </button>`;

const periodModalInsertionPoint = `      {isWeatherModalOpen && (`;

const periodModalReplacement = `      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setIsPeriodModalOpen(false)}>
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] shadow-2xl ring-1 ring-white/20"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-100/20 px-4 py-3">
              <div>
                <div className="text-sm font-black text-cyan-50">Sélection de période</div>
                <div className="text-xs font-semibold text-cyan-50/70">{selectedPeriodDescription} · {selectedPeriodLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-50 transition-colors hover:bg-white/20"
                aria-label="Fermer le calendrier"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['day', 'range', 'month', 'year'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPeriodMode(mode)}
                    className={
                      periodMode === mode
                        ? 'rounded-xl bg-amber-100 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-slate-950 shadow ring-1 ring-amber-200'
                        : 'rounded-xl bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-cyan-50 ring-1 ring-cyan-100/15 transition-colors hover:bg-white/15'
                    }
                  >
                    {periodModeLabels[mode]}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-cyan-100/15 bg-white/10 p-4 ring-1 ring-white/10">
                {periodMode === 'day' && (
                  <label className="grid gap-2 text-sm font-bold text-cyan-50">
                    Jour à afficher
                    <input
                      type="date"
                      value={periodDay}
                      onChange={event => setPeriodDay(event.target.value)}
                      className="h-10 rounded-xl border border-cyan-100/15 bg-[#062f3a] px-3 text-sm font-extrabold text-cyan-50 outline-none focus:ring-2 focus:ring-amber-100/45"
                    />
                  </label>
                )}

                {periodMode === 'range' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold text-cyan-50">
                      Début
                      <input
                        type="date"
                        value={periodStart}
                        onChange={event => setPeriodStart(event.target.value)}
                        className="h-10 rounded-xl border border-cyan-100/15 bg-[#062f3a] px-3 text-sm font-extrabold text-cyan-50 outline-none focus:ring-2 focus:ring-amber-100/45"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-cyan-50">
                      Fin
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={event => setPeriodEnd(event.target.value)}
                        className="h-10 rounded-xl border border-cyan-100/15 bg-[#062f3a] px-3 text-sm font-extrabold text-cyan-50 outline-none focus:ring-2 focus:ring-amber-100/45"
                      />
                    </label>
                  </div>
                )}

                {periodMode === 'month' && (
                  <label className="grid gap-2 text-sm font-bold text-cyan-50">
                    Mois entier
                    <input
                      type="month"
                      value={periodMonth}
                      onChange={event => setPeriodMonth(event.target.value)}
                      className="h-10 rounded-xl border border-cyan-100/15 bg-[#062f3a] px-3 text-sm font-extrabold text-cyan-50 outline-none focus:ring-2 focus:ring-amber-100/45"
                    />
                  </label>
                )}

                {periodMode === 'year' && (
                  <label className="grid gap-2 text-sm font-bold text-cyan-50">
                    Année entière
                    <input
                      type="number"
                      min="2024"
                      max="2035"
                      value={periodYear}
                      onChange={event => setPeriodYear(event.target.value)}
                      className="h-10 rounded-xl border border-cyan-100/15 bg-[#062f3a] px-3 text-sm font-extrabold text-cyan-50 outline-none focus:ring-2 focus:ring-amber-100/45"
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-cyan-50 ring-1 ring-cyan-100/15 transition-colors hover:bg-white/15"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={applyPeriodSelection}
                  className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-slate-950 shadow-lg ring-1 ring-amber-200 transition-colors hover:bg-amber-50"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWeatherModalOpen && (`;

export const homeHeaderPeriodPatch = (): Plugin => ({
  name: 'home-header-period-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    next = replaceRequired(next, periodHelpersInsertionPoint, periodHelpersReplacement, 'helpers periode');
    next = replaceRequired(next, stateSource, stateReplacement, 'etat periode');
    next = replaceRequired(next, gridSource, gridReplacement, 'grille entete');
    next = replaceRequired(next, titleSource, titleReplacement, 'titre et site');
    next = replaceRequired(next, periodPanelSource, periodPanelReplacement, 'suppression listes mois annee');
    next = replaceRequired(next, weatherUrlSource, weatherUrlReplacement, 'meteo thillois');
    next = replaceRequired(next, 'Météo Montévrain', 'Météo Thillois', 'libelle meteo');
    next = replaceRequired(next, '<div className="text-xs font-semibold text-cyan-50/70">Montévrain</div>', '<div className="text-xs font-semibold text-cyan-50/70">Thillois</div>', 'libelle modal meteo');
    next = replaceRequired(next, periodCallbacksInsertionPoint, periodCallbacksReplacement, 'callbacks periode');
    next = replaceRequired(next, dateTileSource, dateTileReplacement, 'tuile calendrier');
    next = replaceRequired(next, periodModalInsertionPoint, periodModalReplacement, 'modal periode');

    return { code: next, map: null };
  },
});
