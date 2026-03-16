import React, { useState } from 'react';
import { ChevronLeft, LayoutDashboard, Target, TrendingUp, History } from 'lucide-react';
import { useData } from './DataContext';
import BudgetEdgAnnuel from './BudgetEdgAnnuel';
import RealiseEdgAnneeFiscale from './RealiseEdgAnneeFiscale';
import VsBudget from './VsBudget';
import VsN1 from './VsN1';

interface EdgAnnuelTabsProps {
  onBack: () => void;
  initialTab?: 'budget' | 'realise' | 'vs_budget' | 'vs_n1';
}

export default function EdgAnnuelTabs({ onBack, initialTab = 'budget' }: EdgAnnuelTabsProps) {
  const { selectedYear } = useData();
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'budget', label: 'Budget EDG annuel', icon: LayoutDashboard, component: BudgetEdgAnnuel },
    { id: 'realise', label: 'Réalisé EDG annuel', icon: Target, component: RealiseEdgAnneeFiscale },
    { id: 'vs_budget', label: 'VS Budget', icon: TrendingUp, component: VsBudget },
    { id: 'vs_n1', label: 'VS N-1', icon: History, component: VsN1 },
  ] as const;

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || BudgetEdgAnnuel;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header with Back Button and Tabs */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Retour"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">EDG Annuel</h1>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Buro Monte - {selectedYear}</p>
              </div>
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 uppercase tracking-wide">
                Année Fiscale
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden border-t border-slate-100 overflow-x-auto scrollbar-hide">
          <div className="flex p-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                    isActive 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {/* We pass a dummy onBack because we handle it in the header */}
          <ActiveComponent onBack={() => {}} hideHeader={true} />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
