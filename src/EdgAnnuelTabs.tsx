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

            <div className="flex items-center gap-3">
              <div className="hidden sm:block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 uppercase tracking-wide">
                Année Fiscale
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div style={{ padding: '12px 28px', display: 'flex', gap: 8, background: '#fff', borderTop: '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            let icon = '📁';
            let accentBg = '#475569';
            let accentColor = '#fff';
            
            switch (tab.id) {
              case 'budget': icon = '📊'; accentBg = '#3b82f6'; break;
              case 'realise': icon = '🎯'; accentBg = '#92400e'; break;
              case 'vs_budget': icon = '📈'; accentBg = '#1e40af'; break;
              case 'vs_n1': icon = 'History'; accentBg = '#047857'; break;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive ? accentBg : '#f8fafc',
                  border: `1.5px solid ${isActive ? accentBg : '#e2e8f0'}`,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all .15s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: 14 }}>{icon === 'History' ? '🔄' : icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
                </span>
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
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
