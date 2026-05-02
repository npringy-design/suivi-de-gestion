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
import { getDashboardRowIndices } from './utils';

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
      <div className="home-summary-footer mt-auto border-t border-cyan-100/20 pt-[clamp(0.45rem,0.8vh,0.75rem)]">
        <div className="home-card-description text-xs leading-relaxed text-cyan-50/80">{description}</div>
      </div>
    </div>
  );
}

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);

export default function Home() {
  const { data, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [weeklyForecast, setWeeklyForecast] = useState<Array<{ date: string; code: number; tempMin: number; tempMax: number; rain: number }>>([]);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [dayEvent, setDayEvent] = useState('Fête du jour');
  const [today, setToday] = useState(() => new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

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
    }),
    [navigate, month],
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        'https://api.open-meteo.com/v1/forecast?latitude=48.8755&longitude=2.7467&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis&forecast_days=7',
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

  const getWeatherIcon = useMemo(
    () => (code: number, size = 'w-4 h-4') => {
      if (code === 0) return <Sun className={`${size} text-amber-400`} />;
      if (code === 1 || code === 2 || code === 3) return <Cloud className={`${size} text-slate-300`} />;
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
        return 'Peu nuageux';
      case 2:
        return 'Partiellement nuageux';
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

  const dashboardRowIndices = getDashboardRowIndices(data, month);
  const { rowFirstDay, rowLastDay } = dashboardRowIndices;

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
    if (!Array.isArray(data) || data.length === 0) {
      return { caMois: 0, caJour: 0, tmJour: 0, budgetCouvert: 0 };
    }

    const caMois = moisIndex >= 0 ? n(data[moisIndex]?.CA_Realise) : 0;
    const caJour = jourIndex >= 0 ? n(data[jourIndex]?.CA_Realise) : 0;
    const nbCouverts = jourIndex >= 0 ? n(data[jourIndex]?.Nombre_de_Couverts) : 0;
    const tmJour = nbCouverts > 0 ? caJour / nbCouverts : 0;

    let totalBudgetCA = 0;
    let totalRealiseCA = 0;

    for (let i = rowFirstDay; i <= rowLastDay && i < data.length; i++) {
      totalBudgetCA += n(data[i]?.CA_Budget);
      totalRealiseCA += n(data[i]?.CA_Realise);
    }

    const budgetCouvert = totalBudgetCA > 0 ? (totalRealiseCA / totalBudgetCA) * 100 : 0;

    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, moisIndex, jourIndex, rowFirstDay, rowLastDay]);

  const chartDataCA = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const res = [];
    for (let i = rowFirstDay; i <= rowLastDay && i < data.length; i++) {
      const jour = data[i]?.Jour || '';
      const caReal = n(data[i]?.CA_Realise);
      const caBudg = n(data[i]?.CA_Budget);
      res.push({ name: jour, CA_Realise: caReal, CA_Budget: caBudg });
    }
    return res;
  }, [data, rowFirstDay, rowLastDay]);

  const chartDataFG = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || moisIndex < 0) return [];

    const row = data[moisIndex];
    if (!row) return [];

    return [
      { name: 'Salaires', value: n(row?.Frais_de_Personnel) },
      { name: 'Fournitures', value: n(row?.Total_Fournitures) },
      { name: 'Loyer', value: n(row?.Loyer_et_Charges) },
      { name: 'Énergie', value: n(row?.Frais_Energie) },
      { name: 'Assurances', value: n(row?.Assurances) },
      { name: 'Autres', value: n(row?.Autres_FG) },
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
              <NavItem label="Calculette" onClick={navigationHandlers.goToCalculetteSalaires} />
              <NavItem label="Vacances" onClick={navigationHandlers.goToVisuelVacances} />
            </NavGroup>
          </nav>
        </div>
      </aside>

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

                <div className="relative grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(170px,230px)_auto] lg:items-center">
                  <div className="min-w-0 py-0.5">
                    <div className="home-separator mb-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    <h1 className="home-title font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Au Bureau
                    </h1>
                    <div className="home-separator mt-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mt-1.5 max-w-[360px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Montévrain
                    </div>
                  </div>

                  <div className="home-period-panel grid grid-cols-2 gap-2 rounded-2xl border border-cyan-100/25 bg-[#052a34]/72 p-2 shadow-lg shadow-black/20 ring-1 ring-white/10 backdrop-blur-sm lg:grid-cols-1">
                    <select
                      value={month}
                      onChange={e => setSelectedMonth(e.target.value)}
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

                  <div className="w-full lg:w-auto">
                    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
                      <button
                        type="button"
                        onClick={() => setIsWeatherModalOpen(true)}
                        className="home-weather-tile min-h-[72px] rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] px-3 py-1.5 text-left shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[clamp(180px,15vw,220px)]"
                        aria-label="Ouvrir les prévisions météo de la semaine"
                      >
                        <div className="border-b border-cyan-100/20 pb-0.5 text-center text-[11px] font-black text-cyan-50">
                          Météo Montévrain
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

                      <div className="home-date-tile relative min-h-[72px] overflow-hidden rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#06313b] via-[#0b5f65] to-[#16847d] px-3 py-1.5 shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[clamp(215px,18vw,265px)]">
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="shrink-0">
              <div className="home-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="CA Réalisé"
                  value={fe(kpis.caMois)}
                  description="Performance du mois en cours versus budget"
                  icon={TrendingUp}
                  accentClass="bg-gradient-to-br from-cyan-600 to-teal-800"
                />
                <SummaryCard
                  label="CA du Jour"
                  value={fe(kpis.caJour)}
                  description="Résultat journalier mesuré aujourd'hui"
                  icon={DollarSign}
                  accentClass="bg-gradient-to-br from-teal-500 to-cyan-800"
                />
                <SummaryCard
                  label="Ticket Moyen"
                  value={fe(kpis.tmJour)}
                  description="Valeur moyenne par couvert du jour"
                  icon={Activity}
                  accentClass="bg-gradient-to-br from-amber-500 to-teal-700"
                />
                <SummaryCard
                  label="Réalisation Budget"
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

            <section className="home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4">
              <div className="home-chart-card flex min-h-[260px] flex-col rounded-2xl border border-cyan-900/10 bg-white/90 p-[clamp(0.9rem,1.2vw,1.35rem)] shadow-sm transition-shadow duration-300 hover:shadow-lg lg:min-h-0">
                <div className="home-chart-header mb-3 flex items-center justify-between">
                  <div>
                    <div className="home-chart-title mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <TrendingUp className="h-5 w-5 text-cyan-700" />
                      Évolution du CA
                    </div>
                    <p className="home-chart-subtitle text-xs text-slate-500">Réalisé vs Budget mensuel</p>
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
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
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
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
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

      {isWeatherModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setIsWeatherModalOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] shadow-2xl ring-1 ring-white/20"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-100/20 px-4 py-3">
              <div>
                <div className="text-sm font-black text-cyan-50">Prévision semaine</div>
                <div className="text-xs font-semibold text-cyan-50/70">Montévrain</div>
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
