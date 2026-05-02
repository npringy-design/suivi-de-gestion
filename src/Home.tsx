import { useMemo, useState, useEffect, useCallback, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, FileText, 
  Settings, TrendingUp, PieChart as PieChartIcon, 
  FileSpreadsheet, Menu, DollarSign, Activity,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  X, Calendar
} from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line, PieChart, Pie, Cell } from 'recharts';

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
      <div className="flex items-center gap-2 px-5 mb-2 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        <Icon className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-3">
        {children}
      </div>
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
        group relative text-left px-3 py-2 rounded-lg text-[12.5px] font-semibold
        transition-all duration-300 ease-out
        ${active
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      <span className="relative z-10">{label}</span>
      {!active && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-blue-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
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

type ForecastDay = {
  date: string;
  code: number;
  min: number;
  max: number;
  precipitation: number | null;
};

export function SummaryCard({ label, value, description, icon: Icon, accentClass, trend }: SummaryCardProps) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-slate-300/80 transition-all duration-500 h-full flex flex-col backdrop-blur-sm animate-slideUp">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 flex items-center gap-2">
            {label}
            {trend && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 leading-none tracking-tight">{value}</div>
        </div>
        <div className={`
          w-12 h-12 rounded-xl ${accentClass} 
          flex items-center justify-center text-white shadow-lg
          transform group-hover:scale-110 group-hover:rotate-6
          transition-all duration-500
        `}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-auto pt-3 border-t border-slate-100">
        <div className="text-xs leading-relaxed text-slate-500">{description}</div>
      </div>
    </div>
  );
}

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export default function Home() {
  const { data, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<{ temp: number, code: number, wind?: number, direction?: number } | null>(null);
  const [forecastDays, setForecastDays] = useState<ForecastDay[]>([]);
  const [isForecastOpen, setIsForecastOpen] = useState(false);
  const [dayEvent, setDayEvent] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const year = selectedYear;
  const month = selectedMonth;

  const navigationHandlers = useMemo(() => ({
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
  }), [navigate, month]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=48.8755&longitude=2.7467&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=Europe%2FParis'
      );
      const data = await res.json();
      if (data.current_weather) {
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
          wind: data.current_weather.windspeed,
          direction: data.current_weather.winddirection,
        });
      }

      if (data.daily?.time?.length) {
        setForecastDays(
          data.daily.time.map((date: string, index: number) => ({
            date,
            code: data.daily.weathercode?.[index] ?? 3,
            min: data.daily.temperature_2m_min?.[index] ?? 0,
            max: data.daily.temperature_2m_max?.[index] ?? 0,
            precipitation: data.daily.precipitation_probability_max?.[index] ?? null,
          }))
        );
      }
    } catch (err) {
      console.error("Erreur météo:", err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const refreshWeather = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => window.clearInterval(refreshWeather);
  }, [loadWeather]);

  const getWeatherIcon = useMemo(() => (code: number, size: string = "w-4 h-4") => {
    if (code === 0) return <Sun className={`${size} text-amber-500`} />;
    if (code === 1 || code === 2 || code === 3) return <Cloud className={`${size} text-slate-400`} />;
    if (code >= 51 && code <= 67) return <CloudRain className={`${size} text-blue-500`} />;
    if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-slate-300`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-600`} />;
    if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-slate-400`} />;
    if (code >= 95 && code <= 99) return <CloudLightning className={`${size} text-amber-600`} />;
    if (code === 45 || code === 48) return <CloudFog className={`${size} text-slate-300`} />;
    return <Cloud className={`${size} text-slate-400`} />;
  }, []);

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

  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return directions[Math.round(deg / 45) % 8];
  };

  const getFeteDesMeres = (year: number) => {
    const lastMayDay = new Date(year, 4, 31);
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

  const formatForecastDate = (dateIso: string) => {
    const date = new Date(`${dateIso}T12:00:00`);
    const formatted = date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const clean = formatted.replace('.', '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const cleanDayEventName = (name: string) => {
    return name
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getDayEvent = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const key = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;

    const saintsByDay: Record<string, string> = {
      '28-04': 'Sainte Valérie',
    };

    if (month === 5 && day === 1) {
      return 'Fête du Travail';
    }
    if (month === 5 && day === getFeteDesMeres(date.getFullYear())) {
      return 'Fête des Mères';
    }

    return saintsByDay[key] || '';
  };

  const loadDayEvent = useCallback(async (date: Date) => {
    const monthNumber = date.getMonth() + 1;
    const dayNumber = date.getDate();
    const fallbackEvent = getDayEvent(date);
    const cacheKey = `home-day-event-${date.getFullYear()}-${monthNumber}-${dayNumber}`;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setDayEvent(cached);
        return;
      }

      const res = await fetch(
        `https://nominis.cef.fr/json/saintdujour.php?annee=${date.getFullYear()}&mois=${monthNumber}&jour=${dayNumber}`
      );
      const json = await res.json();
      const rawName = json?.response?.saintdujour?.nom;
      const eventName = typeof rawName === 'string' ? cleanDayEventName(rawName) : '';

      if (eventName) {
        window.localStorage.setItem(cacheKey, eventName);
        setDayEvent(eventName);
      } else {
        setDayEvent(fallbackEvent);
      }
    } catch (err) {
      console.error("Erreur fête du jour:", err);
      setDayEvent(fallbackEvent);
    }
  }, []);

  useEffect(() => {
    loadDayEvent(new Date());
  }, [loadDayEvent]);

  const today = new Date();

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
      return day === today.getDate() && mon === (today.getMonth() + 1) && yr === today.getFullYear();
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
    const caJourBudget = jourIndex >= 0 ? n(data[jourIndex]?.CA_Budget) : 1;
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
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const res = [];
    for (let i = rowFirstDay; i <= rowLastDay && i < data.length; i++) {
      const jour = data[i]?.Jour || '';
      const caReal = n(data[i]?.CA_Realise);
      const caBudg = n(data[i]?.CA_Budget);
      res.push({ name: jour, CA_Realise: caReal, CA_Budget: caBudg });
    }
    return res;
  }, [data, rowFirstDay, rowLastDay]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const chartDataFG = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || moisIndex < 0) {
      return [];
    }
    
    const row = data[moisIndex];
    if (!row) return [];
    
    return [
      { name: 'Salaires', value: n(row?.Frais_de_Personnel) },
      { name: 'Fournitures', value: n(row?.Total_Fournitures) },
      { name: 'Loyer', value: n(row?.Loyer_et_Charges) },
      { name: 'Énergie', value: n(row?.Frais_Energie) },
      { name: 'Assurances', value: n(row?.Assurances) },
      { name: 'Autres', value: n(row?.Autres_FG) }
    ].filter(item => item.value > 0);
  }, [data, moisIndex]);

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = [2024, 2025, 2026];
  const dayEventLabel = dayEvent || getDayEvent(today) || 'Fête du jour';

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideRight {
          from { 
            opacity: 0;
            transform: translateX(-20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 0.5s ease-out;
        }

        .weather-cloud {
          animation: floatCloud 4s ease-in-out infinite;
        }

        .weather-rain {
          position: absolute;
          left: 50%;
          top: 100%;
          width: 32px;
          height: 28px;
          transform: translateX(-50%);
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }

        .rain-drop {
          width: 2px;
          height: 10px;
          border-radius: 999px;
          opacity: 0;
          animation: rainFall 0.75s linear infinite;
        }

        .rain-drop-1 { animation-delay: 0s; }
        .rain-drop-2 { animation-delay: 0.15s; }
        .rain-drop-3 { animation-delay: 0.3s; }

        .weather-wind {
          position: absolute;
          right: -4px;
          top: 8px;
          width: 16px;
          height: 16px;
        }

        .weather-wind::before,
        .weather-wind::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          animation: windSweep 1.2s ease-in-out infinite;
        }

        .weather-wind::before {
          top: 4px;
          right: 0;
          transform-origin: right center;
        }

        .weather-wind::after {
          top: 10px;
          right: 0;
          animation-delay: 0.4s;
        }

        .weather-flash {
          position: absolute;
          width: 8px;
          height: 16px;
          top: 6px;
          right: 3px;
          border-radius: 2px;
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95));
          opacity: 0.8;
          transform: skewX(-15deg);
          animation: lightning 1.5s ease-in-out infinite;
        }

        @keyframes floatCloud {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes rainFall {
          0% { opacity: 0; transform: translateY(-2px); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateY(14px); }
        }

        @keyframes windSweep {
          0% { transform: translateX(0) scaleX(1); opacity: 0.8; }
          50% { transform: translateX(-6px) scaleX(0.9); opacity: 0.5; }
          100% { transform: translateX(0) scaleX(1); opacity: 0.8; }
        }

        @keyframes lightning {
          0%, 30% { opacity: 0; }
          35% { opacity: 1; transform: skewX(-15deg) scaleY(1); }
          40% { opacity: 0; }
          100% { opacity: 0; }
        }

        /* Stagger animations for grid items */
        .grid > *:nth-child(1) { animation-delay: 0ms; }
        .grid > *:nth-child(2) { animation-delay: 100ms; }
        .grid > *:nth-child(3) { animation-delay: 200ms; }
        .grid > *:nth-child(4) { animation-delay: 300ms; }
        .grid > *:nth-child(5) { animation-delay: 400ms; }
        .grid > *:nth-child(6) { animation-delay: 500ms; }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        border-r border-slate-700/50
        transform transition-transform duration-500 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        shadow-2xl lg:shadow-none
      `}>
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          {/* Period selector - compact header */}
          <div className="relative p-3 border-b border-slate-700/50">
            <div className="flex items-center justify-end mb-2 lg:hidden">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={month}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-hidden py-3 px-2">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-900">{month} {year}</div>
                <div className="text-xs text-slate-500">Dashboard</div>
              </div>
              <div className="w-10 h-10" /> {/* Spacer */}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header avec info contextuelles */}
            <section className="animate-slideRight">
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex-1">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      Au Bureau Montévrain
                    </h1>
                  </div>

                  <div className="w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                      <div className="min-w-[150px] rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-md">
                        <div className="text-center text-[13px] font-semibold text-slate-500">
                          {formatDateFr(today)}
                        </div>

                        <div className="my-2.5 border-t border-slate-200" />

                        <div className="text-center text-[13px] text-slate-500">
                          <span>Fête du jour : </span>
                          <span className="font-semibold text-slate-900">
                            {dayEventLabel}
                          </span>
                        </div>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsForecastOpen(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsForecastOpen(true);
                          }
                        }}
                        className="min-w-[170px] rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex h-11 w-11 items-center justify-center">
                            {weather ? (
                              getWeatherIcon(weather.code, 'w-10 h-10')
                            ) : (
                              <Sun className="w-10 h-10 text-amber-400" />
                            )}
                          </div>

                          <div className="text-[36px] leading-none font-extrabold text-slate-900">
                            {weather ? `${Math.round(weather.temp)}°C` : '--°C'}
                          </div>
                        </div>

                        <div className="mt-2 text-center text-[13px] font-medium text-slate-500">
                          {weather ? getWeatherLabel(weather.code) : 'Chargement...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* KPIs Grid */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label="CA Réalisé"
                  value={fe(kpis.caMois)}
                  description="Performance du mois en cours versus budget"
                  icon={TrendingUp}
                  accentClass="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <SummaryCard
                  label="CA du Jour"
                  value={fe(kpis.caJour)}
                  description="Résultat journalier mesuré aujourd'hui"
                  icon={DollarSign}
                  accentClass="bg-gradient-to-br from-emerald-500 to-emerald-600"
                />
                <SummaryCard
                  label="Ticket Moyen"
                  value={fe(kpis.tmJour)}
                  description="Valeur moyenne par couvert du jour"
                  icon={Activity}
                  accentClass="bg-gradient-to-br from-amber-500 to-amber-600"
                />
                <SummaryCard
                  label="Réalisation Budget"
                  value={`${Math.min(kpis.budgetCouvert, 999).toFixed(1)} %`}
                  description="Taux d'atteinte du budget mensuel"
                  icon={FileSpreadsheet}
                  accentClass={kpis.budgetCouvert >= 100 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'}
                />
              </div>
            </section>

            {/* Charts Grid */}
            <section className="grid gap-6 lg:grid-cols-2">
              {/* CA Evolution Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Évolution du CA
                    </div>
                    <p className="text-xs text-slate-500">Réalisé vs Budget mensuel</p>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataCA} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="colorRealise" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value}€`}
                        dx={-10}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 10px 40px rgba(15,23,42,0.15)', 
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 15, fontSize: 11, fontWeight: 600 }}
                        iconType="circle"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="CA_Realise" 
                        name="CA Réalisé" 
                        stroke="#3b82f6" 
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

              {/* Expenses Pie Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 animate-slideUp" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                      <PieChartIcon className="w-5 h-5 text-amber-500" />
                      Répartition des Frais
                    </div>
                    <p className="text-xs text-slate-500">Structure des charges du mois</p>
                  </div>
                </div>
                <div className="h-[280px]">
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
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 10px 40px rgba(15,23,42,0.15)', 
                          fontSize: 12,
                          fontWeight: 600
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

      {isForecastOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setIsForecastOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-black text-slate-900">Prévision météo semaine</div>
                <div className="text-xs font-semibold text-slate-500">Montévrain · 7 jours</div>
              </div>
              <button
                onClick={() => setIsForecastOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                aria-label="Fermer les prévisions météo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-7">
              {forecastDays.length > 0 ? (
                forecastDays.map(day => (
                  <div
                    key={day.date}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center shadow-sm"
                  >
                    <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-600">
                      {formatForecastDate(day.date)}
                    </div>
                    <div className="mb-2 flex justify-center">
                      {getWeatherIcon(day.code, 'h-7 w-7')}
                    </div>
                    <div className="mb-2 min-h-[30px] text-[11px] font-semibold leading-tight text-slate-600">
                      {getWeatherLabel(day.code)}
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {Math.round(day.max)}° / {Math.round(day.min)}°
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">
                      Pluie {day.precipitation ?? 0}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600">
                  Prévisions indisponibles pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
