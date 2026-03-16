import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Calculator, FileText, 
  Settings, CreditCard, TrendingUp, PieChart, 
  FileSpreadsheet, Receipt, Building2, ChevronRight,
  Briefcase, Utensils, Menu, X, DollarSign, Users, Activity,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog
} from 'lucide-react';
import { useData } from './DataContext';
import { getDashboardRowIndices } from './utils';

interface HomeProps {
  year: number;
  onMonthSelect: (month: number) => void;
  onSyntheseCA: () => void;
  onRecapAnnuel: () => void;
  onReporting: () => void;
  onEdgMensuel: (month: number) => void;
  onBudgetEdgAnnuel: () => void;
  onVsBudget: () => void;
  onVsN1: () => void;
  onRealiseEdgAnneeFiscale: () => void;
  onMiseEnPaiement: (month: number) => void;
  onFactureDevis: () => void;
  onConfigSalaires: () => void;
  onCalculetteSalaires: () => void;
  onVisuelVacances: () => void;
}

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export default function Home({ 
  year, onMonthSelect, onSyntheseCA, onRecapAnnuel, onReporting, 
  onEdgMensuel, onBudgetEdgAnnuel, onVsBudget, onVsN1, onRealiseEdgAnneeFiscale, 
  onMiseEnPaiement, onFactureDevis, onConfigSalaires, onCalculetteSalaires, 
  onVisuelVacances 
}: HomeProps) {
  const { data, setSelectedYear } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);

  useEffect(() => {
    // Fetch weather for Paris (can be adjusted to the restaurant's location)
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

  const getWeatherIcon = (code: number, size: string = "w-4 h-4") => {
    if (code === 0) return <Sun className={`${size} text-amber-500`} />;
    if (code === 1 || code === 2 || code === 3) return <Cloud className={`${size} text-slate-400`} />;
    if (code >= 45 && code <= 48) return <CloudFog className={`${size} text-slate-400`} />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className={`${size} text-blue-500`} />;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow className={`${size} text-sky-300`} />;
    if (code >= 95) return <CloudLightning className={`${size} text-amber-600`} />;
    return <Sun className={`${size} text-amber-500`} />;
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const kpis = useMemo(() => {
    const md = data[currentMonth]?.dashboard || {};
    const indices = getDashboardRowIndices(currentMonth, year);
    
    let caMois = 0;
    let couvertsMois = 0;

    // Calculate up to today
    for (let d = 1; d <= currentDay; d++) {
      const rIdx = indices[d];
      if (rIdx) {
        caMois += n(md[`${rIdx}-1`]) + n(md[`${rIdx}-2`]);
        couvertsMois += n(md[`${rIdx}-3`]) + n(md[`${rIdx}-4`]);
      }
    }

    const todayRowIdx = indices[currentDay];
    let caJour = 0;
    let couvertsJour = 0;
    if (todayRowIdx) {
      caJour = n(md[`${todayRowIdx}-1`]) + n(md[`${todayRowIdx}-2`]);
      couvertsJour = n(md[`${todayRowIdx}-3`]) + n(md[`${todayRowIdx}-4`]);
    }

    const tmJour = couvertsJour > 0 ? caJour / couvertsJour : 0;

    const edgData = data[currentMonth]?.edgMensuel || {};
    const budgetCaMois = n(edgData['ca_total_ht']);
    const budgetCouvert = budgetCaMois > 0 ? (caMois / budgetCaMois) * 100 : 0;

    return {
      caMois,
      budgetCaMois,
      budgetCouvert,
      caJour,
      couvertsJour,
      tmJour
    };
  }, [data, currentMonth, currentDay, year]);

  const NavGroup = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-4 mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );

  const NavItem = ({ label, onClick, active = false }: { label: string, onClick: () => void, active?: boolean }) => (
    <button 
      onClick={onClick}
      className={`text-left px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-500 text-white' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center h-8">
            <div className="flex flex-col w-1.5 h-full mr-3 rounded-full overflow-hidden">
              <div className="flex-1 bg-rose-500" />
              <div className="flex-1 bg-emerald-500" />
              <div className="flex-1 bg-blue-500" />
              <div className="flex-1 bg-amber-500" />
            </div>
            <span className="text-2xl font-serif text-white leading-none self-center">D</span>
            <span className="text-[10px] font-bold text-slate-400 self-end mb-0.5 ml-0.5">M</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 scrollbar-hide">
          <NavGroup title="Suivi Quotidien" icon={BarChart3}>
            <NavItem label="Accéder au Suivi Quotidien" onClick={() => onMonthSelect(currentMonth)} />
            <NavItem label="Synthèse CA" onClick={onSyntheseCA} />
            <NavItem label="Récapitulatif annuel" onClick={onRecapAnnuel} />
            <NavItem label="Reporting annuel détaillé" onClick={onReporting} />
          </NavGroup>

          <NavGroup title="État de Gestion (EDG)" icon={PieChart}>
            <NavItem label="Accéder à l'EDG Mensuel" onClick={() => onEdgMensuel(currentMonth)} />
            <NavItem label="EDG Annuel (Budget/Réalisé/VS)" onClick={onBudgetEdgAnnuel} />
          </NavGroup>

          <NavGroup title="Paiements" icon={CreditCard}>
            <NavItem label="Accéder aux Paiements" onClick={() => onMiseEnPaiement(currentMonth)} />
            <NavItem label="Établir une facture ou un devis" onClick={onFactureDevis} />
          </NavGroup>

          <NavGroup title="Configuration" icon={Settings}>
            <NavItem label="Salaires et charges" onClick={onConfigSalaires} />
            <NavItem label="Calculette salaires" onClick={onCalculetteSalaires} />
            <NavItem label="Visuel vacances & événements" onClick={onVisuelVacances} />
          </NavGroup>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Tableau de Bord</h1>
              <div className="text-xs font-medium text-slate-500">Buro Monte · {year}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:block pl-2">Année</span>
              <select
                value={year}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2 py-1 text-sm font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {Array.from({ length: Math.max(2026, new Date().getFullYear()) - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="px-3 py-1.5 text-xs font-bold tracking-wider text-blue-600 uppercase bg-blue-50 border border-blue-100 rounded-lg hidden sm:block">
              {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-screen-2xl mx-auto">
            
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">Aperçu du mois en cours</h2>
            
            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              
              {/* CA Mois */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-wider truncate">CA Réalisé (Mois)</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 truncate">Depuis le 1er du mois</div>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 mb-2 truncate">{fe(kpis.caMois)}</div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-sm text-slate-500 truncate">Budget: {fe(kpis.budgetCaMois)}</span>
                  <span className={`text-[10px] sm:text-sm font-bold shrink-0 ${kpis.budgetCouvert >= 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {kpis.budgetCouvert.toFixed(1)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${kpis.budgetCouvert >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(kpis.budgetCouvert, 100)}%` }}
                  />
                </div>
              </div>

              {/* CA Jour */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-wider truncate">CA du Jour</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 truncate">Aujourd'hui</div>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 mb-2 truncate">{fe(kpis.caJour)}</div>
              </div>

              {/* TM Jour */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-wider truncate">Ticket Moyen</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 truncate">Aujourd'hui</div>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 mb-2 truncate">{fe(kpis.tmJour)}</div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                  <span className="text-[10px] sm:text-sm text-slate-500 truncate">{kpis.couvertsJour} couverts</span>
                </div>
              </div>

              {/* Météo */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                    {weather ? getWeatherIcon(weather.code, "w-4 h-4 sm:w-5 sm:h-5") : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-wider truncate">Météo</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 truncate">Paris</div>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 mb-2 truncate">
                  {weather ? `${weather.temp}°C` : '--°C'}
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-[10px] sm:text-sm text-slate-500 truncate">Conditions actuelles</span>
                </div>
              </div>

            </div>

            {/* Quick Actions Grid */}
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">Accès Rapides</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button onClick={() => onMonthSelect(currentMonth)} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-slate-700 text-center">Saisir la journée</span>
              </button>
              
              <button onClick={() => onEdgMensuel(currentMonth)} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-slate-700 text-center">Voir l'EDG du mois</span>
              </button>

              <button onClick={() => onMiseEnPaiement(currentMonth)} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-slate-700 text-center">Gérer les paiements</span>
              </button>

              <button onClick={onSyntheseCA} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl hover:border-purple-300 hover:shadow-md transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-slate-700 text-center">Synthèse CA</span>
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
