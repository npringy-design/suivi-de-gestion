import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Calculator, FileText, 
  Settings, CreditCard, TrendingUp, PieChart as PieChartIcon, 
  FileSpreadsheet, Receipt, Building2, ChevronRight,
  Briefcase, Utensils, Menu, X, DollarSign, Users, Activity,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog
} from 'lucide-react';
import { useData } from './DataContext';
import { getDashboardRowIndices } from './utils';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line, PieChart, Pie, Cell } from 'recharts';

interface HomeProps {
  year: number;
  month: number;
  setMonth: (month: number) => void;
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
  year, month, setMonth, onMonthSelect, onSyntheseCA, onRecapAnnuel, onReporting, 
  onEdgMensuel, onBudgetEdgAnnuel, onVsBudget, onVsN1, onRealiseEdgAnneeFiscale, 
  onMiseEnPaiement, onFactureDevis, onConfigSalaires, onCalculetteSalaires, 
  onVisuelVacances 
}: HomeProps) {
  const { data, setSelectedYear } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const currentDay = today.getDate();

  const kpis = useMemo(() => {
    const md = data[month]?.dashboard || {};
    const indices = getDashboardRowIndices(month, year);
    
    let caMois = 0;
    let couvertsMois = 0;

    // Calculate up to today (if we are in the current month/year)
    const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
    const maxDay = isCurrentMonth ? currentDay : new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= maxDay; d++) {
      const rIdx = indices[d];
      if (rIdx) {
        caMois += n(md[`${rIdx}-17`]) + n(md[`${rIdx}-18`]) + n(md[`${rIdx}-20`]) + n(md[`${rIdx}-22`]);
        couvertsMois += n(md[`${rIdx}-33`]) + n(md[`${rIdx}-35`]) + n(md[`${rIdx}-43`]);
      }
    }

    const todayRowIdx = indices[isCurrentMonth ? currentDay : 1]; // Fallback to 1st if not current month
    let caJour = 0;
    let couvertsJour = 0;
    if (todayRowIdx) {
      caJour = n(md[`${todayRowIdx}-17`]) + n(md[`${todayRowIdx}-18`]) + n(md[`${todayRowIdx}-20`]) + n(md[`${todayRowIdx}-22`]);
      couvertsJour = n(md[`${todayRowIdx}-33`]) + n(md[`${todayRowIdx}-35`]) + n(md[`${todayRowIdx}-43`]);
    }

    const tmJour = couvertsJour > 0 ? caJour / couvertsJour : 0;

    const edgData = data[month]?.edgMensuel || {};
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
  }, [data, month, year, currentDay, today]);

  const chartDataCA = useMemo(() => {
    const md = data[month]?.dashboard || {};
    const indices = getDashboardRowIndices(month, year);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const chartData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const rIdx = indices[d];
      if (rIdx) {
        const CA_Realise = n(md[`${rIdx}-17`]) + n(md[`${rIdx}-18`]) + n(md[`${rIdx}-20`]) + n(md[`${rIdx}-22`]);
        const CA_Budget = n(md[`${rIdx}-0`]) + n(md[`${rIdx}-1`]) + n(md[`${rIdx}-2`]);
        chartData.push({
          name: d.toString(),
          CA_Realise,
          CA_Budget
        });
      }
    }
    return chartData;
  }, [data, month, year]);

  const chartDataFG = useMemo(() => {
    const md = data[month]?.dashboard || {};
    const fg = (b: number, g: number) => {
      let total = 0;
      for (let dIdx = 0; dIdx < 10; dIdx++) {
        total += n(md[`fg-data-${b}-${g}-${dIdx}-3`]);
      }
      return total;
    };
    
    return [
      { name: 'Entretien', value: fg(0,0) },
      { name: 'Ecolab', value: fg(0,1) },
      { name: 'Marketing', value: fg(0,2) },
      { name: 'Petit matériel', value: fg(1,0) },
      { name: 'HACCP', value: fg(1,1) },
      { name: 'Autres', value: fg(1,2) },
      { name: 'Tenue', value: fg(2,0) },
      { name: 'Bureau', value: fg(2,1) },
      { name: 'Énergie', value: fg(2,2) },
      { name: 'Animation', value: fg(3,0) },
      { name: 'Transport', value: fg(3,1) },
      { name: 'Divers', value: fg(3,2) }
    ].filter(item => item.value > 0);
  }, [data, month]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#f4a460'];

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
            <NavItem label="Accéder au Suivi Quotidien" onClick={() => onMonthSelect(month)} />
            <NavItem label="Synthèse CA" onClick={onSyntheseCA} />
            <NavItem label="Récapitulatif annuel" onClick={onRecapAnnuel} />
            <NavItem label="Reporting annuel détaillé" onClick={onReporting} />
          </NavGroup>

          <NavGroup title="État de Gestion (EDG)" icon={PieChartIcon}>
            <NavItem label="Accéder à l'EDG Mensuel" onClick={() => onEdgMensuel(month)} />
            <NavItem label="EDG Annuel (Budget/Réalisé/VS)" onClick={onBudgetEdgAnnuel} />
          </NavGroup>

          <NavGroup title="Paiements" icon={CreditCard}>
            <NavItem label="Accéder aux Paiements" onClick={() => onMiseEnPaiement(month)} />
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
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:block pl-2">Mois</span>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="px-2 py-1 text-sm font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-slate-50">
          <div className="max-w-screen-2xl mx-auto">
            
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Aperçu du mois en cours</h2>
            
            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              
              {/* CA Mois */}
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">CA Réalisé (Mois)</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">Depuis le 1er du mois</div>
                  </div>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 mb-1 truncate">{fe(kpis.caMois)}</div>
                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[9px] sm:text-xs text-slate-500 truncate">Budget: {fe(kpis.budgetCaMois)}</span>
                  <span className={`text-[9px] sm:text-xs font-bold shrink-0 ${kpis.budgetCouvert >= 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {kpis.budgetCouvert.toFixed(1)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${kpis.budgetCouvert >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(kpis.budgetCouvert, 100)}%` }}
                  />
                </div>
              </div>

              {/* CA Jour */}
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">CA du Jour</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">Aujourd'hui</div>
                  </div>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 mb-1 truncate">{fe(kpis.caJour)}</div>
              </div>

              {/* TM Jour */}
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Ticket Moyen</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">Aujourd'hui</div>
                  </div>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 mb-1 truncate">{fe(kpis.tmJour)}</div>
                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-[9px] sm:text-xs text-slate-500 truncate">{kpis.couvertsJour} couverts</span>
                </div>
              </div>

              {/* Météo */}
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                    {weather ? getWeatherIcon(weather.code, "w-3.5 h-3.5 sm:w-4 sm:h-4") : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Météo</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">Paris</div>
                  </div>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 mb-1 truncate">
                  {weather ? `${weather.temp}°C` : '--°C'}
                </div>
                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-1">
                  <span className="text-[9px] sm:text-xs text-slate-500 truncate">Conditions actuelles</span>
                </div>
              </div>

            </div>

            {/* SYNTHESE VISUELLE */}
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Synthèse Visuelle du mois</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6">
              {/* CA Chart */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Évolution du CA (Réalisé vs Budget)
                </h3>
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataCA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 10 }} />
                      <Line type="monotone" dataKey="CA_Realise" name="CA Réalisé" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="CA_Budget" name="CA Budget" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* FG Pie Chart */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-500" />
                  Répartition des Frais Généraux
                </h3>
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataFG}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 30 : 50}
                        outerRadius={isMobile ? 60 : 80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartDataFG.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 12 }}
                      />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
