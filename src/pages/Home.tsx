import { useMemo, useState, useEffect, useCallback, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Settings,
  TrendingUp,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Menu,
  DollarSign,
  Activity,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  X,
  Calendar,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useData } from '@/contexts/DataContext';
import { parseMoneyValue } from '@/lib/money';
import { getValidAccessToken } from '@/services/supabaseAuth';
import { getDashboardRowIndices } from '@/lib/utils';

type IconComponent = ComponentType<{ className?: string }>;

type NavGroupProps = {
  title: string;
  icon: IconComponent;
  children: ReactNode;
};

export function NavGroup({ title, icon: Icon, children }: NavGroupProps) {
  return (
    <div className="mb-3">
      <div className="mx-2 mb-2 rounded-xl border border-cyan-200/15 bg-cyan-100/10 px-3 py-2 shadow-inner shadow-black/10">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50">
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-100/20">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span>{title}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-cyan-200/35 to-transparent" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-3">{children}</div>
    </div>
  );
}

type NavItemProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
};

export function NavItem({ label, onClick, active = false }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold transition-all duration-300 ease-out
        ${
          active
            ? 'bg-gradient-to-r from-[#078892] to-[#0f5d66] text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-200/20'
            : 'text-cyan-100/70 hover:bg-cyan-300/10 hover:text-white'
        }
      `}
    >
      <span className="relative z-10">{label}</span>
      {!active && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-300/0 to-teal-300/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
      )}
    </button>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: IconComponent;
  accentClass: string;
  trend?: { value: number; label: string };
};

export function SummaryCard({ label, value, description, icon: Icon, accentClass, trend }: SummaryCardProps) {
  return (
    <div className="home-summary-card group relative flex h-full min-h-[112px] flex-col overflow-hidden rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-[#061f28] via-[#073846] to-[#0b5a62] p-[clamp(0.8rem,1vw,1.25rem)] shadow-sm shadow-slate-950/10 backdrop-blur-sm transition-all duration-500 hover:border-cyan-200/50 hover:shadow-xl hover:shadow-cyan-950/20">
      <div className="mb-[clamp(0.55rem,1vh,1rem)] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="home-summary-label mb-[clamp(0.45rem,0.8vh,0.75rem)] flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/75">
            {label}
            {trend && (
              <span className={`rounded-full px-2 py-0.5 text-[9px] ${trend.value >= 0 ? 'bg-emerald-300/20 text-emerald-100' : 'bg-red-300/20 text-red-100'}`}>
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
            )}
          </div>
          <div className="home-summary-value text-[clamp(1.85rem,2.15vw,2.5rem)] font-black leading-none tracking-tight text-amber-50 drop-shadow-sm">
            {value}
          </div>
        </div>
        <div
          className={`
            home-summary-icon flex h-[clamp(2.35rem,3vw,3rem)] w-[clamp(2.35rem,3vw,3rem)]
            items-center justify-center rounded-xl ${accentClass}
            text-white shadow-lg ring-1 ring-white/20 transition-all duration-500
            group-hover:rotate-6 group-hover:scale-110
          `}
        >
          <Icon className="h-[clamp(1.15rem,1.55vw,1.5rem)] w-[clamp(1.15rem,1.55vw,1.5rem)]" />
        </div>
      </div>

    </div>
  );
}

const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
};

export default function Home() {
  const { data, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
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
  const [periodYear, setPeriodYear] = useState(() => String(selectedYear));
  const [today, setToday] = useState(() => new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [canManageUsers, setCanManageUsers] = useState(false);

  const year = selectedYear;
  const month = selectedMonth;
  const todayEventKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const navigationHandlers = useMemo(
    () => ({
      goToDashboard: () => navigate(`/dashboard/${month}`),
      goToSyntheseCA: () => navigate('/synthese'),
      goToRecapAnnuel: () => navigate('/recap-annuel'),
      goToReporting: () => navigate('/reporting'),
      goToEdgMensuel: () => navigate(`/edg-mensuel/${month}`),
      goToBudgetEdgAnnuel: () => navigate('/budget-edg-annuel'),
      goToMiseEnPaiement: () => navigate(`/mise-en-paiement/${month}`),
      goToFactureDevis: () => navigate('/facture-devis'),
      goToConfigSalaires: () => navigate('/config-salaires'),
      goToCalculetteSalaires: () => navigate('/calculette-salaires'),
      goToVisuelVacances: () => navigate('/visuel-vacances'),
      goToEcrituresComptables: () => navigate('/ecritures-comptables'),
    }),
    [navigate, month],
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkUserManagementAccess = async () => {
      const token = await getValidAccessToken().catch(() => null);
      if (!token) {
        if (mounted) setCanManageUsers(false);
        return;
      }

      const response = await fetch('/api/suiviAccount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);

      if (mounted) setCanManageUsers(Boolean(response?.ok));
    };

    void checkUserManagementAccess();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const refreshDate = window.setInterval(() => setToday(new Date()), 60 * 1000);
    return () => window.clearInterval(refreshDate);
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'fr';
    document.documentElement.setAttribute('translate', 'no');

    let meta = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'google';
      document.head.appendChild(meta);
    }
    meta.content = 'notranslate';
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=49.2567&longitude=3.955&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis&forecast_days=7',
      );
      const meteo = await res.json();

      if (meteo.current_weather) {
        setWeather({
          temp: meteo.current_weather.temperature,
          code: meteo.current_weather.weathercode,
        });
      }

      if (meteo.daily?.time) {
        setWeeklyForecast(
          meteo.daily.time.map((date: string, index: number) => ({
            date,
            code: meteo.daily.weather_code?.[index] ?? 0,
            tempMin: meteo.daily.temperature_2m_min?.[index] ?? 0,
            tempMax: meteo.daily.temperature_2m_max?.[index] ?? 0,
            rain: meteo.daily.precipitation_sum?.[index] ?? 0,
          })),
        );
      }
    } catch (err) {
      console.error('Erreur météo:', err);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const refreshWeather = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => window.clearInterval(refreshWeather);
  }, [loadWeather]);

  const getWeatherIcon = useCallback((code: number, size = 'w-4 h-4') => {
      if (code === 0 || code === 1 || code === 2) return <Sun className={`${size} text-amber-400`} />;
      if (code === 3) return <Cloud className={`${size} text-slate-300`} />;
      if (code >= 51 && code <= 67) return <CloudRain className={`${size} text-blue-400`} />;
      if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-slate-200`} />;
      if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-400`} />;
      if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-slate-200`} />;
      if (code >= 95 && code <= 99) return <CloudLightning className={`${size} text-amber-500`} />;
      if (code === 45 || code === 48) return <CloudFog className={`${size} text-slate-300`} />;
      return <Cloud className={`${size} text-slate-300`} />;
    },
    [],
  );

  const getWeatherLabel = (code: number) => {
    switch (code) {
      case 0:
        return 'Ciel dégagé';
      case 1:
        return 'Beau temps';
      case 2:
        return 'Éclaircies';
      case 3:
        return 'Couvert';
      case 45:
        return 'Brouillard';
      case 48:
        return 'Brouillard givrant';
      case 51:
      case 53:
      case 55:
        return 'Bruine';
      case 56:
      case 57:
        return 'Bruine verglaçante';
      case 61:
      case 63:
      case 65:
        return 'Pluie';
      case 66:
      case 67:
        return 'Pluie verglaçante';
      case 71:
      case 73:
      case 75:
        return 'Neige';
      case 77:
        return 'Grésil';
      case 80:
      case 81:
      case 82:
        return 'Averses';
      case 85:
      case 86:
        return 'Neige';
      case 95:
      case 96:
      case 99:
        return 'Orage';
      default:
        return 'Temps variable';
    }
  };

  const getFeteDesMeres = (currentYear: number) => {
    const lastMayDay = new Date(currentYear, 4, 31);
    const offset = lastMayDay.getDay() === 0 ? 0 : lastMayDay.getDay();
    return 31 - offset;
  };

  const formatDateFr = (date: Date) => {
    const formatted = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const selectedPeriodLabel = useMemo(() => formatHomePeriodLabel(homePeriod), [homePeriod]);
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

  const getDayEvent = (date: Date) => {
    const currentMonth = date.getMonth() + 1;
    const day = date.getDate();
    const key = `${String(day).padStart(2, '0')}-${String(currentMonth).padStart(2, '0')}`;

    const saintsByDay: Record<string, string> = {
      '28-04': 'Sainte Valérie',
    };

    if (currentMonth === 5 && day === 1) return 'Fête du Travail';
    if (currentMonth === 5 && day === getFeteDesMeres(date.getFullYear())) return 'Fête des Mères';

    return saintsByDay[key] || 'Fête du jour';
  };

  const loadDayEvent = useCallback(async (date: Date) => {
    try {
      const res = await fetch(
        `https://nominis.cef.fr/json/nominis.php?jour=${date.getDate()}&mois=${date.getMonth() + 1}&annee=${date.getFullYear()}`,
      );
      const nominis = await res.json();
      const firstNames = nominis?.response?.prenoms?.majeurs;
      const firstName = firstNames ? Object.keys(firstNames)[0] : '';

      if (firstName) {
        setDayEvent(`Saint ${firstName}`);
        return;
      }
    } catch (err) {
      console.error('Erreur fête du jour:', err);
    }

    setDayEvent(getDayEvent(date));
  }, []);

  useEffect(() => {
    loadDayEvent(today);
  }, [loadDayEvent, todayEventKey]);

  const formatForecastDay = (date: string) => {
    const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const dashboardRowIndices = getDashboardRowIndices(month, year);
  const dashboardRowValues = Object.values(dashboardRowIndices);
  const rowFirstDay = dashboardRowValues.length > 0 ? Math.min(...dashboardRowValues) : 0;
  const rowLastDay = dashboardRowValues.length > 0 ? Math.max(...dashboardRowValues) : 0;

  const indices = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { moisIndex: -1, jourIndex: -1 };
    }

    const moisIndex = data.findIndex(row => row.Mois === month);
    const jourIndex = data.findIndex(row => {
      const d = row.Jour;
      if (!d) return false;

      const parts = d.split('/');
      if (parts.length !== 3) return false;

      const day = parseInt(parts[0], 10);
      const mon = parseInt(parts[1], 10);
      const yr = parseInt(parts[2], 10);

      return day === today.getDate() && mon === today.getMonth() + 1 && yr === today.getFullYear();
    });

    return { moisIndex, jourIndex };
  }, [data, month, today]);

  const { moisIndex, jourIndex } = indices;

  const kpis = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const parseDashboardValue = parseMoneyValue;
    const dashboardValue = (rowIndex: number, colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const selectedDay = now.getFullYear() === year && now.getMonth() === month ? Math.max(1, Math.min(now.getDate() - 1, daysInMonth)) : daysInMonth;
    const rowIndexForDay = (day: number) => dashboardRowIndices[day];
    const realisedDayCA = (day: number) => {
      const rowIndex = rowIndexForDay(day);
      if (typeof rowIndex !== 'number') return 0;
      return [17, 18, 19, 20].reduce((sum, col) => sum + dashboardValue(rowIndex, col), 0);
    };
    const budgetDayCA = (day: number) => {
      const rowIndex = rowIndexForDay(day);
      if (typeof rowIndex !== 'number') return 0;
      const savedTotal = dashboardValue(rowIndex, 3);
      if (savedTotal > 0) return savedTotal;
      const caMidi = dashboardValue(rowIndex, 0) || dashboardValue(rowIndex, 6) * dashboardValue(rowIndex, 7);
      const caSoir = dashboardValue(rowIndex, 1) || dashboardValue(rowIndex, 8) * dashboardValue(rowIndex, 9);
      const caLimo = dashboardValue(rowIndex, 2) || dashboardValue(rowIndex, 14) * dashboardValue(rowIndex, 15);
      return caMidi + caSoir + caLimo;
    };

    let caMois = 0;
    let totalBudgetCA = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      caMois += realisedDayCA(day);
      totalBudgetCA += budgetDayCA(day);
    }

    const caJour = realisedDayCA(selectedDay);
    const selectedRowIndex = rowIndexForDay(selectedDay);
    const nbCouverts = typeof selectedRowIndex === 'number' ? dashboardValue(selectedRowIndex, 25) + dashboardValue(selectedRowIndex, 27) : 0;
    const caRestaurant = typeof selectedRowIndex === 'number' ? dashboardValue(selectedRowIndex, 18) + dashboardValue(selectedRowIndex, 19) : 0;
    const tmJour = nbCouverts > 0 ? caRestaurant / nbCouverts : 0;
    const budgetCouvert = totalBudgetCA > 0 ? (caMois / totalBudgetCA) * 100 : 0;

    const buildPeriodDates = (start: Date, end: Date) => {
      const dates: Date[] = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      let guard = 0;
      while (cursor.getTime() <= end.getTime() && guard < 400) {
        if (cursor.getFullYear() === year) dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
      return dates;
    };

    const statsForDate = (date: Date) => {
      const statMonth = date.getMonth();
      const monthData = data?.[statMonth];
      const dashboardForDate = monthData?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, date.getFullYear())[date.getDate()];
      if (date.getFullYear() !== year || typeof rowIndex !== 'number') return { ca: 0, budget: 0, restaurant: 0, couverts: 0 };
      const value = (colIndex: number) => parseDashboardValue(dashboardForDate[String(rowIndex) + '-' + String(colIndex)]);
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + value(col), 0);
      const savedBudget = value(3);
      const budget = savedBudget > 0 ? savedBudget : (value(0) || value(6) * value(7)) + (value(1) || value(8) * value(9)) + (value(2) || value(14) * value(15));
      return { ca, budget, restaurant: value(18) + value(19), couverts: value(25) + value(27) };
    };

    const summarizeDates = (dates: Date[]) => dates.reduce((acc, date) => {
      const stats = statsForDate(date);
      return { ca: acc.ca + stats.ca, budget: acc.budget + stats.budget, restaurant: acc.restaurant + stats.restaurant, couverts: acc.couverts + stats.couverts };
    }, { ca: 0, budget: 0, restaurant: 0, couverts: 0 });

    const todayKey = toDateInputValue(today);
    const isDefaultView = homePeriod.mode === 'day' && homePeriod.start === todayKey && homePeriod.end === todayKey;
    if (!isDefaultView) {
      const startRaw = makeLocalDate(homePeriod.start);
      const endRaw = makeLocalDate(homePeriod.end);
      const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
      const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
      const selectedDates = buildPeriodDates(startDate, endDate);
      const safeDates = selectedDates.length > 0 ? selectedDates : [startDate];
      const totals = summarizeDates(safeDates);
      const selectedTm = totals.couverts > 0 ? totals.restaurant / totals.couverts : 0;
      const selectedBudget = totals.budget > 0 ? (totals.ca / totals.budget) * 100 : 0;

      if (homePeriod.mode === 'year') return { caMois: totals.ca, caJour: totals.ca / 12, tmJour: selectedTm, budgetCouvert: selectedBudget };
      if (homePeriod.mode === 'day') return { caMois: totals.ca, caJour: totals.restaurant, tmJour: selectedTm, budgetCouvert: selectedBudget };
      return { caMois: totals.ca, caJour: totals.ca / Math.max(1, safeDates.length), tmJour: selectedTm, budgetCouvert: selectedBudget };
    }

    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, month, year, dashboardRowIndices, homePeriod, today]);


  const payrollCostBubble = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const isSelectedCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const referenceDay = isSelectedCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    const parseValue = parseMoneyValue;

    const dayStats = (day: number) => {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') return { ca: 0, cost: 0 };
      const rowKey = String(rowIndex) + '-';
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + parseValue(dashboard[rowKey + String(col)]), 0);
      const costFromComplete = parseValue(dashboard[rowKey + '87']);
      const ratioFromComplete = parseValue(dashboard[rowKey + '89']);
      const cost = costFromComplete > 0 ? costFromComplete : (ca > 0 && ratioFromComplete > 0 ? (ca * ratioFromComplete) / 100 : 0);
      return { ca, cost };
    };

    const ratioForDays = (days: number[]) => {
      const totals = days.reduce((acc, day) => {
        const stats = dayStats(day);
        return { ca: acc.ca + stats.ca, cost: acc.cost + stats.cost };
      }, { ca: 0, cost: 0 });
      if (totals.ca <= 0 || totals.cost <= 0) return null;
      return (totals.cost / totals.ca) * 100;
    };

    const weekNumberForDay = (targetDay: number) => {
      let weekNumber = 1;
      for (let day = 1; day <= daysInMonth; day += 1) {
        if (day === targetDay) return weekNumber;
        if (new Date(year, month, day).getDay() === 0) weekNumber += 1;
      }
      return weekNumber;
    };

    const weeks: Array<{ week: number; days: number[] }> = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const week = weekNumberForDay(day);
      let item = weeks.find(entry => entry.week === week);
      if (!item) {
        item = { week, days: [] };
        weeks.push(item);
      }
      item.days.push(day);
    }

    const currentWeekNumber = weekNumberForDay(referenceDay);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayDay = yesterdayDate.getFullYear() === year && yesterdayDate.getMonth() === month ? yesterdayDate.getDate() : null;
    const formatPercent = (value: number | null) => value === null ? '-' : value.toFixed(2).replace('.', ',') + ' %';

    const currentWeekDays = weeks.find(entry => entry.week === currentWeekNumber)?.days.filter(day => day <= referenceDay) || [];
    const monthDays = Array.from({ length: referenceDay }, (_, index) => index + 1);
    const previousWeeks = weeks
      .filter(entry => entry.week < currentWeekNumber)
      .map(entry => ({ label: 'Semaine ' + entry.week, value: formatPercent(ratioForDays(entry.days)) }));
    const currentWeekRatio = ratioForDays(currentWeekDays);
    const monthRatio = ratioForDays(monthDays);
    const yesterdayRatio = yesterdayDay ? ratioForDays([yesterdayDay]) : null;
    const weekRows = [
      ...previousWeeks,
      { label: 'Semaine ' + currentWeekNumber + ' en cours', value: formatPercent(currentWeekRatio) },
    ];

    return {
      headline: formatPercent(currentWeekRatio ?? monthRatio ?? yesterdayRatio),
      yesterday: formatPercent(yesterdayRatio),
      currentWeek: formatPercent(currentWeekRatio),
      currentWeekLabel: 'Semaine ' + currentWeekNumber,
      month: formatPercent(monthRatio),
      previousWeeks,
      weekRows,
    };
  }, [data, month, year, dashboardRowIndices]);

  const chartDataCA = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const parseDashboardValue = parseMoneyValue;
    const dashboardValue = (rowIndex: number, colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') continue;
      const caReal = [17, 18, 19, 20].reduce((sum, col) => sum + dashboardValue(rowIndex, col), 0);
      const savedBudget = dashboardValue(rowIndex, 3);
      const caBudget = savedBudget > 0
        ? savedBudget
        : (dashboardValue(rowIndex, 0) || dashboardValue(rowIndex, 6) * dashboardValue(rowIndex, 7))
          + (dashboardValue(rowIndex, 1) || dashboardValue(rowIndex, 8) * dashboardValue(rowIndex, 9))
          + (dashboardValue(rowIndex, 2) || dashboardValue(rowIndex, 14) * dashboardValue(rowIndex, 15));
      rows.push({ name: String(day), CA_Realise: caReal, CA_Budget: caBudget });
    }

    return rows;
  }, [data, month, year, dashboardRowIndices]);

  const chartDataFG = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || moisIndex < 0) return [];

    const row = data[moisIndex];
    if (!row) return [];

    return [
      { name: 'Salaires', value: parseMoneyValue(row?.Frais_de_Personnel) },
      { name: 'Fournitures', value: parseMoneyValue(row?.Total_Fournitures) },
      { name: 'Loyer', value: parseMoneyValue(row?.Loyer_et_Charges) },
      { name: 'Énergie', value: parseMoneyValue(row?.Frais_Energie) },
      { name: 'Assurances', value: parseMoneyValue(row?.Assurances) },
      { name: 'Autres', value: parseMoneyValue(row?.Autres_FG) },
    ].filter(item => item.value > 0);
  }, [data, moisIndex]);

  const COLORS = ['#0891b2', '#14b8a6', '#f59e0b', '#0f766e', '#64748b', '#0e7490'];

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = [2024, 2025, 2026];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#edf8f6] via-[#e7f4f2] to-[#f8f5ed]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideRight {
          from {
            opacity: 0;
            transform: translateX(-18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.45s ease-out both;
        }

        .animate-slideRight {
          animation: slideRight 0.45s ease-out both;
        }

        .home-card-description {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .home-content {
            height: 100vh;
            max-height: 100vh;
          }

          .home-chart-section,
          .home-chart-card {
            min-height: 0;
          }
        }

        @media (min-width: 1024px) and (max-height: 790px) {
          .home-content {
            gap: 0.75rem !important;
            padding: 0.75rem 1rem !important;
          }

          .home-banner {
            padding-top: 0.45rem !important;
            padding-bottom: 0.45rem !important;
          }

          .home-title {
            font-size: clamp(1.9rem, 3.2vw, 2.55rem) !important;
          }

          .home-location,
          .home-separator {
            margin-top: 0.35rem !important;
          }

          .home-period-panel,
          .home-weather-tile,
          .home-date-tile {
            min-height: 58px !important;
            padding-top: 0.35rem !important;
            padding-bottom: 0.35rem !important;
            border-radius: 0.9rem !important;
          }

          .home-period-panel select {
            height: 1.9rem !important;
            font-size: 0.75rem !important;
          }

          .home-date-calendar {
            width: 2.25rem !important;
            height: 2.6rem !important;
          }

          .home-summary-card {
            min-height: 98px !important;
            padding: 0.75rem !important;
          }

          .home-summary-value {
            font-size: 1.75rem !important;
          }

          .home-summary-icon {
            width: 2.2rem !important;
            height: 2.2rem !important;
          }

          .home-summary-label {
            margin-bottom: 0.35rem !important;
          }

          .home-card-description {
            font-size: 0.68rem !important;
            line-height: 1.2 !important;
          }

          .home-chart-card {
            padding: 0.85rem !important;
          }

          .home-chart-header {
            margin-bottom: 0.45rem !important;
          }

          .home-chart-title {
            font-size: 1rem !important;
          }
        }

        @media (min-width: 1024px) and (max-height: 690px) {
          .home-content {
            gap: 0.55rem !important;
            padding-top: 0.55rem !important;
            padding-bottom: 0.55rem !important;
          }

          .home-summary-card {
            min-height: 80px !important;
          }

          .home-summary-footer {
            display: none !important;
          }

          .home-kpi-grid {
            gap: 0.55rem !important;
          }

          .home-chart-subtitle,
          .home-weather-label {
            display: none !important;
          }
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #eef6f4;
        }

        ::-webkit-scrollbar-thumb {
          background: #9fc7c4;
          border-radius: 999px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6ea9a6;
        }
      `}</style>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[clamp(238px,17vw,280px)] shrink-0
          border-r border-cyan-200/10 bg-[linear-gradient(180deg,#07111f_0%,#0a2430_48%,#073d43_100%)]
          shadow-2xl transition-transform duration-500 ease-out lg:static lg:translate-x-0 lg:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_95%_78%,rgba(14,116,144,0.22),transparent_36%)]" />

          <div className="relative border-b border-cyan-200/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">Espace</div>
                <div className="mt-1 text-lg font-black text-cyan-50">Accueil</div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/60 text-cyan-100/70 transition-colors hover:bg-cyan-900/70 hover:text-white lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="relative flex-1 overflow-y-auto px-2 py-3">
            <NavGroup title="Analyse" icon={BarChart3}>
              <NavItem label="Suivi Quotidien" onClick={navigationHandlers.goToDashboard} />
              <NavItem label="Synthèse CA" onClick={navigationHandlers.goToSyntheseCA} />
              <NavItem label="Récap Annuel" onClick={navigationHandlers.goToRecapAnnuel} />
              <NavItem label="Reporting" onClick={navigationHandlers.goToReporting} />
            </NavGroup>

            <NavGroup title="Gestion" icon={FileText}>
              <NavItem label="EdG Mensuel" onClick={navigationHandlers.goToEdgMensuel} />
              <NavItem label="Budget EdG" onClick={navigationHandlers.goToBudgetEdgAnnuel} />
              <NavItem label="Mise en Paiement" onClick={navigationHandlers.goToMiseEnPaiement} />
              <NavItem label="Facture & Devis" onClick={navigationHandlers.goToFactureDevis} />
            </NavGroup>

            <NavGroup title="Outils" icon={Settings}>
              <NavItem label="Config Salaires" onClick={navigationHandlers.goToConfigSalaires} />
              <NavItem label="Info personnel" onClick={navigationHandlers.goToCalculetteSalaires} />
              <NavItem label="Vacances" onClick={navigationHandlers.goToVisuelVacances} />
              <NavItem label="Ecritures comptables" onClick={navigationHandlers.goToEcrituresComptables} />
            </NavGroup>
          </nav>
        </div>
      </aside>

      {canManageUsers && (
        <div className="fixed bottom-5 left-2 z-50 hidden w-[calc(clamp(238px,17vw,280px)-1rem)] px-2 lg:block">
          <button
            type="button"
            onClick={() => navigate('/utilisateurs')}
            className="group relative w-full overflow-hidden rounded-xl border border-cyan-200/15 bg-cyan-100/10 px-3 py-2.5 text-left text-[12.5px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-inner shadow-black/10 transition-all duration-300 hover:bg-cyan-300/15 hover:text-white"
            title="Gestion des utilisateurs"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-100/20">
                <Users className="h-3.5 w-3.5" />
              </span>
              <span>Utilisateurs</span>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-300/0 to-teal-300/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
          </button>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="min-h-full lg:h-full lg:min-h-0">
          <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-900">
                  {month} {year}
                </div>
                <div className="text-xs text-slate-500">Dashboard</div>
              </div>
              <div className="h-10 w-10" />
            </div>
          </div>

          <div className="home-content flex min-h-full flex-col gap-3 p-3 sm:p-4 lg:h-full lg:min-h-0 lg:p-[clamp(0.75rem,1.1vw,1.5rem)] xl:gap-4 2xl:gap-5">
            <section className="shrink-0 animate-slideRight">
              <div className="home-banner relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-r from-[#050914] via-[#101b3f] to-[#123847] px-[clamp(1rem,1.7vw,1.6rem)] py-[clamp(0.55rem,1vh,0.95rem)] shadow-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.18),transparent_1.5px),radial-gradient(circle_at_62%_35%,rgba(255,255,255,0.14),transparent_1.2px),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.12),transparent_1.4px)] bg-[length:150px_110px,210px_150px,170px_130px] opacity-60" />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 via-blue-950/20 to-transparent" />
                <div className="absolute -right-12 -bottom-16 h-32 w-32 rounded-full bg-amber-200/20 blur-3xl" />

                <div className="relative grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
                  <div className="min-w-0 py-0.5 text-center lg:pl-[clamp(1.5rem,5vw,6rem)]">
                    <div className="home-separator mx-auto mb-1.5 h-px max-w-[520px] bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    <h1 className="home-title text-center font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Hippopotamus
                    </h1>
                    <div className="home-separator mx-auto mt-1.5 h-px max-w-[520px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mx-auto mt-1.5 max-w-[520px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Thillois
                    </div>
                  </div>


                  <div className="w-full lg:w-auto">
                    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
                      <button
                        type="button"
                        onClick={() => setIsWeatherModalOpen(true)}
                        className="home-weather-tile min-h-[72px] rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] px-3 py-1.5 text-left shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[clamp(180px,15vw,220px)]"
                        aria-label="Ouvrir les prévisions météo de la semaine"
                      >
                        <div className="border-b border-cyan-100/20 pb-0.5 text-center text-[11px] font-black text-cyan-50">
                          Météo Thillois
                        </div>
                        <div className="mt-1.5 flex items-center justify-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-cyan-100/20">
                            {weather ? getWeatherIcon(weather.code, 'h-7 w-7') : <Sun className="h-7 w-7 text-amber-400" />}
                          </div>
                          <div className="text-[clamp(1.55rem,2.2vw,1.9rem)] font-extrabold leading-none text-amber-50">
                            {weather ? `${Math.round(weather.temp)}°C` : '--°C'}
                          </div>
                        </div>
                        <div className="home-weather-label mt-0.5 text-center text-[10.5px] font-semibold text-cyan-50/80">
                          {weather ? getWeatherLabel(weather.code) : 'Chargement...'}
                        </div>
                      </button>

                      <button
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
                            {!(homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today)) && (
                              <div className="mt-1 truncate rounded-lg bg-cyan-950/25 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-[0.08em] text-amber-100/90 ring-1 ring-cyan-100/10">
                                {homePeriod.mode === 'day' ? 'Jour sélectionné · ' + selectedPeriodLabel : selectedPeriodDescription + ' · ' + selectedPeriodLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="shrink-0">
              <div className="home-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label={homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today) ? 'CA réalisé' : homePeriod.mode === 'month' ? 'CA mois' : homePeriod.mode === 'year' ? 'CA année' : homePeriod.mode === 'day' ? 'CA total jour' : 'CA période'}
                  value={fe(kpis.caMois)}
                  description="Performance du mois en cours versus budget"
                  icon={TrendingUp}
                  accentClass="bg-gradient-to-br from-cyan-600 to-teal-800"
                />
                <SummaryCard
                  label={homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today) ? 'CA veille' : homePeriod.mode === 'year' ? 'CA moy. / mois' : homePeriod.mode === 'day' ? 'CA resto hors VAE' : 'CA moy. / jour'}
                  value={fe(kpis.caJour)}
                  description="Résultat de la veille"
                  icon={DollarSign}
                  accentClass="bg-gradient-to-br from-teal-500 to-cyan-800"
                />
                <SummaryCard
                  label={homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today) ? 'TM veille' : homePeriod.mode === 'month' ? 'TM mois' : homePeriod.mode === 'year' ? 'TM année' : homePeriod.mode === 'day' ? 'TM resto jour' : 'TM période'}
                  value={fe(kpis.tmJour)}
                  description="Valeur moyenne par couvert de la veille"
                  icon={Activity}
                  accentClass="bg-gradient-to-br from-amber-500 to-teal-700"
                />
                <SummaryCard
                  label={homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today) ? 'Réalisation Budget' : homePeriod.mode === 'month' ? 'Budget mois' : homePeriod.mode === 'year' ? 'Budget année' : homePeriod.mode === 'day' ? 'Budget jour' : 'Budget période'}
                  value={`${Math.min(kpis.budgetCouvert, 999).toFixed(1)} %`}
                  description="Taux d'atteinte du budget mensuel"
                  icon={FileSpreadsheet}
                  accentClass={
                    kpis.budgetCouvert >= 100
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-800'
                      : 'bg-gradient-to-br from-cyan-700 to-slate-800'
                  }
                />
              </div>
            </section>

            <section className="shrink-0">
              <div className="home-summary-card group relative min-h-[112px] overflow-hidden rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-[#061f28] via-[#073846] to-[#0b5a62] p-[clamp(0.8rem,1vw,1.15rem)] shadow-sm shadow-slate-950/10 backdrop-blur-sm transition-all duration-500 hover:border-cyan-200/50 hover:shadow-xl hover:shadow-cyan-950/20">
                <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-cyan-200/10 blur-2xl" />
                <div className="relative grid gap-3 lg:grid-cols-[minmax(250px,0.9fr)_minmax(300px,1.1fr)] lg:items-stretch">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-xl border border-cyan-100/20 bg-cyan-950/25 px-3 py-2 ring-1 ring-white/5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">S/C Veille</div>
                      <div className="mt-1 text-[clamp(1.7rem,2.1vw,2.25rem)] font-black leading-none text-amber-50 drop-shadow-sm">
                        {payrollCostBubble.yesterday}
                      </div>
                    </div>
                    <div className="rounded-xl border border-cyan-100/20 bg-cyan-950/25 px-3 py-2 ring-1 ring-white/5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">S/C Mois</div>
                      <div className="mt-1 text-[clamp(1.7rem,2.1vw,2.25rem)] font-black leading-none text-amber-50 drop-shadow-sm">
                        {payrollCostBubble.month}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-100/20 bg-white/8 px-3 py-2 ring-1 ring-white/10">
                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-cyan-100/20 pb-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-300/10 text-[10px] text-cyan-50 ring-1 ring-cyan-100/20">S/C</span>
                        Semaine
                      </div>
                      <div className="text-sm font-black text-amber-50">{payrollCostBubble.headline}</div>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                      {payrollCostBubble.weekRows.map(item => (
                        <div key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-cyan-950/25 px-2.5 py-1.5 ring-1 ring-cyan-100/10">
                          <span className="truncate text-[11px] font-bold text-cyan-50/75">{item.label}</span>
                          <span className="shrink-0 text-[12px] font-black text-amber-50">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4">
              <div className="home-chart-card flex min-h-[260px] flex-col rounded-2xl border border-cyan-900/10 bg-white/90 p-[clamp(0.9rem,1.2vw,1.35rem)] shadow-sm transition-shadow duration-300 hover:shadow-lg lg:min-h-0">
                <div className="home-chart-header mb-3 flex items-center justify-between">
                  <div>
                    <div className="home-chart-title mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <TrendingUp className="h-5 w-5 text-cyan-700" />
                      Évolution du CA
                    </div>
                    <p className="home-chart-subtitle text-xs text-slate-500">{homePeriod.mode === 'day' && homePeriod.start === toDateInputValue(today) && homePeriod.end === toDateInputValue(today) ? 'Réalisé vs Budget mensuel' : homePeriod.mode === 'month' ? 'Réalisé vs Budget du mois sélectionné' : homePeriod.mode === 'year' ? 'Réalisé vs Budget annuel' : homePeriod.mode === 'day' ? 'Réalisé vs Budget du jour sélectionné' : 'Réalisé vs Budget de la période sélectionnée'}</p>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataCA} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="colorRealise" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={value => `${value}€`}
                        dx={-10}
                      />
                      <RechartsTooltip
                        formatter={value => [`${Number(value || 0).toFixed(2)} €`, '']}
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 10px 40px rgba(15,23,42,0.15)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 15, fontSize: 11, fontWeight: 600 }} iconType="circle" />
                      <Line
                        type="monotone"
                        dataKey="CA_Realise"
                        name="CA Réalisé"
                        stroke="#0891b2"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        fillOpacity={1}
                        fill="url(#colorRealise)"
                      />
                      <Line
                        type="monotone"
                        dataKey="CA_Budget"
                        name="CA Budget"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                className="home-chart-card flex min-h-[260px] flex-col rounded-2xl border border-cyan-900/10 bg-white/90 p-[clamp(0.9rem,1.2vw,1.35rem)] shadow-sm transition-shadow duration-300 hover:shadow-lg lg:min-h-0"
                style={{ animationDelay: '100ms' }}
              >
                <div className="home-chart-header mb-3 flex items-center justify-between">
                  <div>
                    <div className="home-chart-title mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <PieChartIcon className="h-5 w-5 text-amber-500" />
                      Répartition des Frais
                    </div>
                    <p className="home-chart-subtitle text-xs text-slate-500">Structure des charges du mois</p>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataFG}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 45 : 60}
                        outerRadius={isMobile ? 75 : 95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartDataFG.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={value => [`${Number(value || 0).toFixed(2)} €`, '']}
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 10px 40px rgba(15,23,42,0.15)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {isPeriodModalOpen && (
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

      {isWeatherModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setIsWeatherModalOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] shadow-2xl ring-1 ring-white/20"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-100/20 px-4 py-3">
              <div>
                <div className="text-sm font-black text-cyan-50">Prévision semaine</div>
                <div className="text-xs font-semibold text-cyan-50/70">Thillois</div>
              </div>
              <button
                type="button"
                onClick={() => setIsWeatherModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-50 transition-colors hover:bg-white/20"
                aria-label="Fermer les prévisions météo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 p-4">
              {weeklyForecast.length > 0 ? (
                weeklyForecast.map(day => (
                  <div key={day.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-cyan-100/15 bg-white/10 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-amber-50">{formatForecastDay(day.date)}</div>
                      <div className="text-xs font-semibold text-cyan-50/75">{getWeatherLabel(day.code)}</div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-cyan-100/20">
                      {getWeatherIcon(day.code, 'h-6 w-6')}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-amber-50">
                        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-50/70">{day.rain.toFixed(1)} mm</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-cyan-100/15 bg-white/10 px-3 py-4 text-center text-sm font-semibold text-cyan-50/80">
                  Prévisions en cours de chargement...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}
