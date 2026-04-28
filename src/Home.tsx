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
          ? 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white shadow-lg shadow-cyan-700/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      <span className="relative z-10">{label}</span>
      {!active && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 to-teal-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
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
    <div className="group relative overflow-hidden rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-[#061f28] via-[#073846] to-[#0b5a62] p-4 xl:p-5 2xl:p-6 shadow-sm shadow-slate-950/10 hover:shadow-xl hover:shadow-cyan-950/20 hover:border-cyan-200/50 transition-all duration-500 h-full flex flex-col backdrop-blur-sm animate-slideUp">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_86%_92%,rgba(245,201,126,0.16),transparent_30%)] pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3 mb-3 2xl:gap-4 2xl:mb-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/75 font-bold mb-2 2xl:mb-3 flex items-center gap-2">
            {label}
            {trend && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${trend.value >= 0 ? 'bg-emerald-300/20 text-emerald-100' : 'bg-red-300/20 text-red-100'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          <div className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-amber-50 leading-none tracking-tight drop-shadow-sm">{value}</div>
        </div>
        <div className={`
          w-10 h-10 xl:w-11 xl:h-11 2xl:w-12 2xl:h-12 rounded-xl ${accentClass} 
          flex items-center justify-center text-white shadow-lg ring-1 ring-white/20
          transform group-hover:scale-110 group-hover:rotate-6
          transition-all duration-500
        `}>
          <Icon className="w-5 h-5 2xl:w-6 2xl:h-6" />
        </div>
      </div>
      <div className="relative mt-auto pt-2 2xl:pt-3 border-t border-cyan-100/20">
        <div className="text-[11px] xl:text-xs leading-relaxed text-cyan-50/80">{description}</div>
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

  useEffect(() => {
    document.documentElement.lang = 'fr';
    document.documentElement.setAttribute('translate', 'no');
    document.body.setAttribute('translate', 'no');

    if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);
    }
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8745&longitude=2.7463&current_weather=true&timezone=Europe%2FParis');
      const data = await res.json();
      if (data.current_weather) {
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
        });
      }
    } catch (err) {
      console.error("Erreur météo:", err);
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
    if (code >= 51 && code <= 67) return <CloudRain className={`${size} text-cyan-700`} />;
    if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-slate-300`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-cyan-700`} />;
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

  const COLORS = ['#0f766e', '#0891b2', '#f59e0b', '#115e59', '#164e63', '#d97706'];

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

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#eef9f8] via-[#e6f4f2] to-[#f8f4eb]">
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
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />
          
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
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
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
          <div className="p-3 sm:p-4 lg:p-4 xl:p-5 2xl:p-8 space-y-4 2xl:space-y-6">
            {/* Header avec info contextuelles */}
            <section className="animate-slideRight">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-r from-[#050914] via-[#101b3f] to-[#123847] px-4 py-2 lg:px-5 2xl:px-6 2xl:py-3 shadow-xl">
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.18),transparent_1.5px),radial-gradient(circle_at_62%_35%,rgba(255,255,255,0.14),transparent_1.2px),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.12),transparent_1.4px)] bg-[length:150px_110px,210px_150px,170px_130px]" />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/30 via-blue-950/20 to-transparent" />
                <div className="absolute -right-12 -bottom-16 h-32 w-32 rounded-full bg-amber-200/20 blur-3xl" />

                <div className="relative flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 py-0.5 2xl:py-1">
                    <div className="mb-1.5 h-px max-w-[320px] 2xl:max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    <h1 className="font-serif text-[28px] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow sm:text-[34px] lg:text-[38px] 2xl:text-[48px]">
                      Au Bureau
                    </h1>
                    <div className="mt-1.5 h-px max-w-[320px] 2xl:max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="mt-1.5 max-w-[320px] 2xl:max-w-[360px] text-center text-[10px] font-bold uppercase tracking-[0.42em] text-white/80 sm:text-[11px] 2xl:text-xs">
                      Montévrain
                    </div>
                  </div>

                  <div className="w-full lg:w-auto">
                    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
                      <div className="min-h-[70px] rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#063642] via-[#0b5a62] to-[#0f7a78] px-3 py-1.5 shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[190px] 2xl:min-h-[82px] 2xl:min-w-[210px] 2xl:py-2">
                        <div className="border-b border-cyan-100/25 pb-0.5 2xl:pb-1 text-center text-[11px] 2xl:text-[12px] font-bold text-amber-50">
                          {formatDateFr(today)}
                        </div>

                        <div className="mt-1.5 2xl:mt-2 flex items-center justify-center gap-2">
                          <div className="flex h-8 w-8 2xl:h-9 2xl:w-9 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-white/20">
                            {weather ? (
                              getWeatherIcon(weather.code, 'w-7 h-7 2xl:w-8 2xl:h-8')
                            ) : (
                              <Sun className="w-7 h-7 2xl:w-8 2xl:h-8 text-amber-500" />
                            )}
                          </div>

                          <div className="text-[25px] 2xl:text-[30px] leading-none font-extrabold text-amber-50">
                            {weather ? `${Math.round(weather.temp)}°C` : '--°C'}
                          </div>
                        </div>

                        <div className="mt-0.5 2xl:mt-1 text-center text-[10px] 2xl:text-[11px] font-semibold text-cyan-50/80">
                          {weather ? getWeatherLabel(weather.code) : 'Chargement...'}
                        </div>
                      </div>

                      <div className="relative min-h-[70px] overflow-hidden rounded-[16px] border border-cyan-100/25 bg-gradient-to-br from-[#052a34] via-[#0a4d58] to-[#0d6b6f] px-3 py-1.5 shadow-lg shadow-black/20 ring-1 ring-white/20 sm:min-w-[220px] 2xl:min-h-[82px] 2xl:min-w-[240px] 2xl:py-2">
                        <div className="absolute inset-x-0 bottom-0 h-7 bg-cyan-950/20" />
                        <div className="relative flex h-full items-center gap-3">
                          <div className="relative flex h-[50px] w-[40px] 2xl:h-[58px] 2xl:w-[46px] shrink-0 flex-col overflow-hidden rounded-lg bg-amber-50/95 shadow-md ring-1 ring-cyan-100/30">
                            <div className="h-3 2xl:h-3.5 bg-teal-800" />
                            <div className="absolute left-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="absolute right-2 top-[-3px] h-4 w-1 rounded-full bg-cyan-100 shadow" />
                            <div className="flex flex-1 items-center justify-center text-[21px] 2xl:text-[24px] font-black text-slate-950">
                              {today.getDate()}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[12px] font-black text-amber-50 sm:text-[13px] 2xl:text-[15px]">
                              <Calendar className="h-3.5 w-3.5 2xl:h-4 2xl:w-4 text-amber-200" />
                              <span>{formatDateFr(today)}</span>
                            </div>
                            <div className="my-1 2xl:my-1.5 h-px bg-cyan-100/25" />
                            <div className="text-[12px] font-extrabold text-cyan-50/80 sm:text-[13px] 2xl:text-sm">
                              {getDayEvent(today) || 'Fête du jour'}
                            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 2xl:gap-4">
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
                  accentClass={kpis.budgetCouvert >= 100 ? 'bg-gradient-to-br from-teal-500 to-cyan-800' : 'bg-gradient-to-br from-cyan-700 to-slate-800'}
                />
              </div>
            </section>

            {/* Charts Grid */}
            <section className="grid gap-4 2xl:gap-6 lg:grid-cols-2">
              {/* CA Evolution Chart */}
              <div className="bg-white/90 rounded-2xl border border-cyan-900/10 p-4 2xl:p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 animate-slideUp">
                <div className="flex items-center justify-between mb-3 2xl:mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                      <TrendingUp className="w-5 h-5 text-cyan-700" />
                      Évolution du CA
                    </div>
                    <p className="text-xs text-slate-500">Réalisé vs Budget mensuel</p>
                  </div>
                </div>
                <div className="h-[clamp(175px,26vh,280px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataCA} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="colorRealise" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
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

              {/* Expenses Pie Chart */}
              <div className="bg-white/90 rounded-2xl border border-cyan-900/10 p-4 2xl:p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 animate-slideUp" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-3 2xl:mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                      <PieChartIcon className="w-5 h-5 text-amber-500" />
                      Répartition des Frais
                    </div>
                    <p className="text-xs text-slate-500">Structure des charges du mois</p>
                  </div>
                </div>
                <div className="h-[clamp(175px,26vh,280px)]">
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
