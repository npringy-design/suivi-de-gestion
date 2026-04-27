import { useMemo, useState, useEffect, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Calculator, FileText, 
  Settings, CreditCard, TrendingUp, PieChart as PieChartIcon, 
  FileSpreadsheet, ChevronRight, Menu, DollarSign, Activity,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  X, ArrowRight, Calendar, Zap
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
    <div className="mb-8 animate-fadeIn">
      <div className="flex items-center gap-2 px-5 mb-4 text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        <Icon className="w-3.5 h-3.5" />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
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
        group relative text-left px-4 py-3 rounded-xl text-[13px] font-semibold
        transition-all duration-300 ease-out
        ${active
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      <span className="relative z-10">{label}</span>
      {!active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-blue-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
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

type ActionTileProps = {
  title: string;
  description: string;
  onClick: () => void;
  icon: IconComponent;
  accentClass: string;
};

export function ActionTile({ title, description, onClick, icon: Icon, accentClass }: ActionTileProps) {
  return (
    <button 
      onClick={onClick} 
      className="group relative text-left bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80 hover:-translate-y-1 flex items-center gap-4 overflow-hidden"
    >
      <div className={`
        w-11 h-11 rounded-lg ${accentClass} 
        flex items-center justify-center text-white shadow-md
        transform group-hover:scale-110 group-hover:rotate-6
        transition-all duration-300
      `}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 mb-0.5">{title}</div>
        <div className="text-xs text-slate-500 truncate">{description}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/30 to-blue-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
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
    fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code')
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code
          });
        }
      })
      .catch(err => console.error("Erreur météo:", err));
  }, []);

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

  const today = new Date();

  const dashboardRowIndices = getDashboardRowIndices(data, month);
  const { rowFirstDay, rowLastDay } = dashboardRowIndices;

  const indices = useMemo(() => {
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
    if (moisIndex < 0) return [];
    const row = data[moisIndex];
    return [
      { name: 'Salaires', value: n(row?.Frais_de_Personnel) },
      { name: 'Fournitures', value: n(row?.Total_Fournitures) },
      { name: 'Loyer', value: n(row?.Loyer_et_Charges) },
      { name: 'Énergie', value: n(row?.Frais_Energie) },
      { name: 'Assurances', value: n(row?.Assurances) },
      { name: 'Autres', value: n(row?.Autres_FG) }
    ].filter(item => item.value > 0);
  }, [data, moisIndex]);

  const quickActions = useMemo(() => [
    { title: 'EdG Mensuel', description: 'État des gains du mois', action: navigationHandlers.goToEdgMensuel, icon: FileText, accentClass: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { title: 'Mise en Paiement', description: 'Gérer les paiements', action: navigationHandlers.goToMiseEnPaiement, icon: CreditCard, accentClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    { title: 'Calculette Salaires', description: 'Outils de calcul', action: navigationHandlers.goToCalculetteSalaires, icon: Calculator, accentClass: 'bg-gradient-to-br from-amber-500 to-amber-600' }
  ], [navigationHandlers]);

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = [2024, 2025, 2026];

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
          
          {/* Header */}
          <div className="relative p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
                <p className="text-xs text-slate-400 mt-1 tracking-wide">Gestion Restaurant</p>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period selector */}
            <div className="space-y-2">
              <select
                value={month}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-2">
            <NavGroup title="Analyse" icon={BarChart3}>
              <NavItem label="Suivi Quotidien" onClick={navigationHandlers.goToDashboard} />
              <NavItem label="Synthèse CA" onClick={navigationHandlers.goToSyntheseCA} />
              <NavItem label="Récapitulatif Annuel" onClick={navigationHandlers.goToRecapAnnuel} />
              <NavItem label="Reporting" onClick={navigationHandlers.goToReporting} />
            </NavGroup>

            <NavGroup title="Gestion" icon={FileText}>
              <NavItem label="EdG Mensuel" onClick={navigationHandlers.goToEdgMensuel} />
              <NavItem label="Budget EdG Annuel" onClick={navigationHandlers.goToBudgetEdgAnnuel} />
              <NavItem label="Mise en Paiement" onClick={navigationHandlers.goToMiseEnPaiement} />
              <NavItem label="Facture & Devis" onClick={navigationHandlers.goToFactureDevis} />
            </NavGroup>

            <NavGroup title="Ressources" icon={Settings}>
              <NavItem label="Config Salaires" onClick={navigationHandlers.goToConfigSalaires} />
              <NavItem label="Calculette Salaires" onClick={navigationHandlers.goToCalculetteSalaires} />
              <NavItem label="Visuel Vacances" onClick={navigationHandlers.goToVisuelVacances} />
            </NavGroup>
          </nav>

          {/* Footer */}
          <div className="relative p-6 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                R
              </div>
              <div>
                <div className="text-sm font-bold text-white">Restaurant Pro</div>
                <div className="text-xs text-slate-400">Version 2.0</div>
              </div>
            </div>
          </div>
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
          <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Hero Section */}
            <section className="animate-slideRight">
              <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-700/50 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                
                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                            Vue d'ensemble
                          </h2>
                          <p className="text-sm text-blue-200 mt-1">Performance en temps réel</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-3">
                      {weather && (
                        <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            {getWeatherIcon(weather.code, 'w-5 h-5')}
                            <span className="text-xl font-bold text-white">{weather.temp}°C</span>
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">Paris</div>
                        </div>
                      )}
                      <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-200" />
                          <span className="text-xl font-bold text-white">
                            {today.toLocaleDateString('fr-FR', { day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">
                          {today.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button 
                      onClick={navigationHandlers.goToDashboard}
                      className="group relative px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">Suivi quotidien</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                    <button 
                      onClick={navigationHandlers.goToSyntheseCA}
                      className="group relative px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">Synthèse CA</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                    <button 
                      onClick={navigationHandlers.goToReporting}
                      className="group relative px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">Reporting</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                    <button 
                      onClick={navigationHandlers.goToConfigSalaires}
                      className="group relative px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">Salaires</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
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

            {/* Charts & Actions */}
            <section className="grid gap-6 lg:grid-cols-3">
              {/* Charts - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
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
              </div>

              {/* Quick Actions - 1 column */}
              <div className="space-y-6">
                {/* Actions Panel */}
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-blue-200/50 p-6 shadow-sm animate-slideUp" style={{ animationDelay: '200ms' }}>
                  <div className="mb-5">
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                      <Zap className="w-5 h-5 text-blue-500" />
                      Actions Rapides
                    </div>
                    <p className="text-xs text-slate-500">Accès direct aux outils clés</p>
                  </div>
                  <div className="space-y-3">
                    {quickActions.map((action, idx) => (
                      <ActionTile
                        key={action.title}
                        title={action.title}
                        description={action.description}
                        onClick={action.action}
                        icon={action.icon}
                        accentClass={action.accentClass}
                      />
                    ))}
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-slideUp" style={{ animationDelay: '300ms' }}>
                  <div className="mb-4">
                    <div className="text-sm font-bold text-slate-900 mb-2">Conseil du jour</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Analysez régulièrement vos KPIs pour anticiper les tendances et ajuster votre stratégie en temps réel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer group">
                    <span>En savoir plus</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
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
