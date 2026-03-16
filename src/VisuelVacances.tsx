import React, { useState } from 'react';
import { useData } from './DataContext';
import { ArrowLeft, Calendar, Trash2, Plus } from 'lucide-react';

interface VisuelVacancesProps {
  onBack: () => void;
}

export default function VisuelVacances({ onBack }: VisuelVacancesProps) {
  const { customEvents, addCustomEvent, removeCustomEvent, selectedYear } = useData();
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLabel, setNewEventLabel] = useState('');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventDate && newEventLabel) {
      addCustomEvent({
        id: Date.now().toString(),
        date: newEventDate,
        label: newEventLabel
      });
      setNewEventDate('');
      setNewEventLabel('');
    }
  };

  const renderTable = (title: string, data: { label: string; date: string }[], accentClass: string) => {
    const accentMap: Record<string, { border: string, bg: string, text: string }> = {
      violet: { border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
      emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      lime: { border: 'border-l-lime-500', bg: 'bg-lime-50', text: 'text-lime-700' }
    };
    const accent = accentMap[accentClass] || accentMap.violet;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className={`px-5 py-4 border-b border-slate-100 border-l-4 ${accent.border} ${accent.bg}`}>
          <h2 className={`text-sm font-bold uppercase tracking-widest ${accent.text}`}>
            {title}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Événement / Période</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{row.label}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getEaster = (year: number) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const easter = getEaster(selectedYear);

  const zoneC = [
    { label: 'Rentrée scolaire', date: `Septembre ${selectedYear - 1}` },
    { label: 'Vacances de la Toussaint', date: `Octobre - Novembre ${selectedYear - 1}` },
    { label: 'Vacances de Noël', date: `Décembre ${selectedYear - 1} - Janvier ${selectedYear}` },
    { label: 'Vacances d\'Hiver', date: `Février - Mars ${selectedYear}` },
    { label: 'Vacances de Printemps', date: `Avril - Mai ${selectedYear}` },
    { label: 'Pont de l\'Ascension', date: `Mai ${selectedYear}` },
    { label: 'Grandes Vacances', date: `Juillet - Août ${selectedYear}` },
  ];

  const feries = [
    { label: 'Jour de l\'An', date: formatDate(new Date(selectedYear, 0, 1)) },
    { label: 'Lundi de Pâques', date: formatDate(addDays(easter, 1)) },
    { label: 'Fête du Travail', date: formatDate(new Date(selectedYear, 4, 1)) },
    { label: 'Victoire 1945', date: formatDate(new Date(selectedYear, 4, 8)) },
    { label: 'Ascension', date: formatDate(addDays(easter, 39)) },
    { label: 'Lundi de Pentecôte', date: formatDate(addDays(easter, 50)) },
    { label: 'Fête Nationale', date: formatDate(new Date(selectedYear, 6, 14)) },
    { label: 'Assomption', date: formatDate(new Date(selectedYear, 7, 15)) },
    { label: 'La Toussaint', date: formatDate(new Date(selectedYear, 10, 1)) },
    { label: 'Armistice 1918', date: formatDate(new Date(selectedYear, 10, 11)) },
    { label: 'Noël', date: formatDate(new Date(selectedYear, 11, 25)) },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Visuel Vacances, Jours Fériés & Événements
              </h1>
              <h2 className="text-sm font-semibold text-slate-500 mt-0.5">
                Buro Monte
              </h2>
            </div>
          </div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            RETOUR ACCUEIL
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            {renderTable('Vacances Scolaires - Zone C (Paris)', zoneC, 'violet')}
          </div>
          <div>
            {renderTable(`Jours Fériés ${selectedYear}`, feries, 'emerald')}
            
            {/* Custom Events Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-6">
              <div className="px-5 py-4 border-b border-slate-100 border-l-4 border-l-lime-500 bg-lime-50">
                <h2 className="text-sm font-bold uppercase tracking-widest text-lime-700">
                  Événements Personnalisés
                </h2>
              </div>
              
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <form onSubmit={handleAddEvent} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                    <input 
                      type="date" 
                      value={newEventDate}
                      onChange={e => setNewEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all"
                      required
                    />
                  </div>
                  <div className="flex-[2] w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de l'événement</label>
                    <input 
                      type="text" 
                      value={newEventLabel}
                      onChange={e => setNewEventLabel(e.target.value)}
                      placeholder="Ex: Soirée spéciale..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="flex items-center gap-2 px-5 py-2 bg-lime-500 text-white font-bold rounded-lg hover:bg-lime-600 transition-colors shadow-sm h-[38px] w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Créer
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Événement</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customEvents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400 italic">
                          Aucun événement personnalisé
                        </td>
                      </tr>
                    ) : (
                      customEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{evt.label}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">
                            {new Date(evt.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button 
                              onClick={() => removeCustomEvent(evt.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
