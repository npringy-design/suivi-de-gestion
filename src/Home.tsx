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
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [today, setToday] = useState(() => new Date());

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
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8755&longitude=2.7467&current_weather=true&timezone=Europe%2FParis');
      const data = await res.json();
      if (data.current_weather) {
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
        });
      }
    } catch (err) {
      console.error("Erreur météo:", err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const interval = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadWeather]);

  useEffect(() => {
    const interval = window.setInterval(() => setToday(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const getWeatherVisual = useMemo(() => (code: number) => {
    if (code === 0) return <Sun className="w-16 h-16 text-amber-400 drop-shadow-lg" />;

    if (code === 1 || code === 2 || code === 3) {
      return (
        <div className="relative h-16 w-20">
          <Sun className="absolute left-0 top-0 w-12 h-12 text-amber-400 drop-shadow-lg" />
          <Cloud className="weather-cloud absolute bottom-1 right-0 w-14 h-14 text-sky-100 fill-sky-100 drop-shadow-lg" />
          <Cloud className="weather-cloud absolute bottom-0 left-4 w-11 h-11 text-slate-200 fill-slate-200 drop-shadow" />
        </div>
      );
    }

    if (code >= 51 && code <= 67) return <CloudRain className="w-16 h-16 text-blue-500 drop-shadow-lg" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-16 h-16 text-slate-300 drop-shadow-lg" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-16 h-16 text-blue-600 drop-shadow-lg" />;
    if (code >= 85 && code <= 86) return <CloudSnow className="w-16 h-16 text-slate-400 drop-shadow-lg" />;
    if (code >= 95 && code <= 99) return <CloudLightning className="w-16 h-16 text-amber-600 drop-shadow-lg" />;
    if (code === 45 || code === 48) return <CloudFog className="w-16 h-16 text-slate-300 drop-shadow-lg" />;

    return <Cloud className="w-16 h-16 text-slate-300 drop-shadow-lg" />;
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
  const dayEvent = getDayEvent(today);
  const weatherStatus = weather ? getWeatherLabel(weather.code) : weatherLoading ? 'Chargement...' : 'Météo indisponible';

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
            {/* Banderole établissement + météo/date */}
            <section className="animate-slideRight">
              <div className="relative overflow-hidden rounded-[22px] border border-slate-800/40 bg-gradient-to-r from-slate-950 via-blue-950 to-cyan-900 shadow-xl">
                <div className="absolute inset-0 opacity-65 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_1.6px),radial-gradient(circle_at_64%_38%,rgba(255,255,255,0.18),transparent_1.2px),radial-gradient(circle_at_78%_74%,rgba(255,255,255,0.14),transparent_1.4px)] bg-[length:160px_120px,210px_160px,180px_140px]" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 via-blue-950/20 to-transparent" />
                <div className="absolute -bottom-8 left-0 h-24 w-[42%] rounded-[60%] bg-slate-950/70 blur-sm" />
                <div className="absolute -bottom-10 left-[18%] h-20 w-[34%] rounded-[60%] bg-slate-900/75 blur-sm" />
                <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-cyan-300/25 blur-3xl" />

                <div className="relative flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 flex-1 items-center">
                    <div className="w-full max-w-[430px]">
                      <div className="mb-3 h-px w-full max-w-[340px] bg-gradient-to-r from-transparent via-amber-200/85 to-transparent" />
                      <div className="font-serif text-[34px] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow sm:text-[44px] lg:text-[50px]">
                        Au Bureau
                      </div>
                      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/90 sm:text-sm">
                        Montévrain
                      </div>
                      <div className="mt-3 h-px w-full max-w-[340px] bg-gradient-to-r from-transparent via-amber-200/85 to-transparent" />
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto">
                    <div className="min-h-[108px] rounded-[20px] border border-white/70 bg-gradient-to-br from-sky-50 via-blue-50 to-sky-200/90 p-3 shadow-lg shadow-black/20 ring-1 ring-sky-200/60 xl:w-[280px]">
                      <div className="border-b border-sky-200/80 pb-1.5 text-center text-sm font-bold text-blue-900 sm:text-base">
                        {formatDateFr(today)}
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        <div className="flex h-14 w-[72px] items-center justify-center">
                          {weather ? getWeatherVisual(weather.code) : <Sun className="w-12 h-12 text-amber-400 drop-shadow-lg" />}
                        </div>
                        <div className="text-[38px] font-black leading-none tracking-tight text-blue-950 sm:text-[46px]">
                          {weather ? `${Math.round(weather.temp)}°C` : '--°C'}
                        </div>
                      </div>
                      <div className="mt-0.5 text-center text-xs font-semibold text-blue-950/90">
                        {weatherStatus}
                      </div>
                    </div>

                    <div className="relative min-h-[108px] overflow-hidden rounded-[20px] border border-white/70 bg-gradient-to-br from-emerald-50 via-lime-50 to-emerald-100 p-3 shadow-lg shadow-black/20 ring-1 ring-emerald-100/70 xl:w-[280px]">
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-emerald-300/35" />
                      <div className="relative flex h-full items-center gap-3">
                        <div className="relative flex h-16 w-[52px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-slate-200">
                          <div className="h-4 bg-rose-500" />
                          <div className="absolute left-2.5 top-[-3px] h-[18px] w-1.5 rounded-full bg-slate-200 shadow" />
                          <div className="absolute right-2.5 top-[-3px] h-[18px] w-1.5 rounded-full bg-slate-200 shadow" />
                          <div className="flex flex-1 items-center justify-center text-2xl font-black text-blue-950">
                            {today.getDate()}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-base font-black text-blue-950 sm:text-lg">
                            <Calendar className="h-[18px] w-[18px] text-blue-900/70" />
                            <span>{formatDateFr(today)}</span>
                          </div>
                          <div className="my-2 h-px bg-emerald-200/80" />
                          <div className="text-sm font-extrabold text-blue-950 sm:text-base">
                            {dayEvent || 'Fête du jour'}
                          </div>
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
