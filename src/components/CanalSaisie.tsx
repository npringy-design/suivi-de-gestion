import type { DayDataTheorique } from '@/contexts/DataContext';
import { formatCurrencyFr, formatNullableCurrencyFr, parseMoneyValue } from '@/lib/money';

import CurrencyInput from './CurrencyInput';

type CanalDayData = Record<string, string>;

export type CanalSaisieConfig = {
  title: string;
  theoriqueLabel: string;
  theoriqueField: keyof DayDataTheorique;
  realLabel: string;
  realField: string;
  secondaryRealLabel?: string;
  secondaryRealField?: string;
  totalLabel?: string;
  secondaryTotalLabel?: string;
  ecartLabel: string;
  commentField?: string;
  valueAlign?: 'right' | 'center';
};

type CanalSaisieProps = {
  month: number;
  year: number;
  onBack: () => void;
  config: CanalSaisieConfig;
  theoriqueData: Record<number, DayDataTheorique>;
  getData: (day: number) => CanalDayData;
  onUpdate: (day: number, field: string, value: string) => void;
  computeEcart?: (reel: number, theorique: number, secondaryReel: number) => number;
};

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const formatDate = (day: number, month: number, year: number) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const NAV = '#1e293b';

export default function CanalSaisie({
  month,
  year,
  onBack,
  config,
  theoriqueData,
  getData,
  onUpdate,
  computeEcart = (reel, theorique) => reel - theorique,
}: CanalSaisieProps) {
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const commentField = config.commentField || 'commentaire';
  const valueAlignClass = config.valueAlign === 'center' ? 'text-center' : 'text-right';

  const getVal = (day: number, field: string) => parseMoneyValue(getData(day)?.[field]);

  const getTheoriqueVal = (day: number, field: keyof DayDataTheorique) => parseMoneyValue(theoriqueData[day]?.[field]);

  const getColTotal = (field: string) => {
    return days.reduce((sum, day) => sum + getVal(day, field), 0);
  };

  const getTheoriqueColTotal = (field: keyof DayDataTheorique) => {
    return days.reduce((sum, day) => sum + getTheoriqueVal(day, field), 0);
  };

  const sumTheorique = getTheoriqueColTotal(config.theoriqueField);
  const sumReel = getColTotal(config.realField);
  const sumSecondaryReel = config.secondaryRealField ? getColTotal(config.secondaryRealField) : 0;
  const sumEcart = computeEcart(sumReel, sumTheorique, sumSecondaryReel);

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      <header style={{
        background: NAV, height: 64, padding: '0 36px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 0 rgba(255,255,255,.05)',
        flexShrink: 0
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1',
            cursor: 'pointer', background: 'none', border: 'none', padding: '8px 0',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'color 0.2s',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour Synthèse
        </button>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {config.title}
        </div>
        <div style={{ width: 140 }} />
      </header>

      <div className="w-full px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4 font-bold text-center w-32 border-r border-slate-200 sticky left-0 z-30 bg-slate-100">Date</th>
                  <th className="px-6 py-4 font-bold text-center w-48 bg-blue-50/50 border-r border-slate-200 text-blue-700">{config.theoriqueLabel}</th>
                  <th className="px-6 py-4 font-bold text-center w-48 bg-amber-50/50 border-r border-slate-200 text-amber-700">{config.realLabel}</th>
                  {config.secondaryRealLabel ? (
                    <th className="px-6 py-4 font-bold text-center w-48 bg-amber-50/50 border-r border-slate-200 text-amber-700">{config.secondaryRealLabel}</th>
                  ) : null}
                  {config.totalLabel ? (
                    <th className="px-6 py-4 font-bold text-center w-48 border-r border-slate-200">{config.totalLabel}</th>
                  ) : null}
                  {config.secondaryTotalLabel ? (
                    <th className="px-6 py-4 font-bold text-center w-48 border-r border-slate-200">{config.secondaryTotalLabel}</th>
                  ) : null}
                  <th className="px-6 py-4 font-bold text-center w-48 border-r border-slate-200">{config.ecartLabel}</th>
                  <th className="px-6 py-4 font-bold min-w-[300px]">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((day) => {
                  const dayData = getData(day);
                  const theorique = getTheoriqueVal(day, config.theoriqueField);
                  const reel = getVal(day, config.realField);
                  const secondaryReel = config.secondaryRealField ? getVal(day, config.secondaryRealField) : 0;
                  const ecart = computeEcart(reel, theorique, secondaryReel);
                  const ecartColor = ecart < -0.001 ? 'text-rose-600 bg-rose-50/50' : ecart > 0.001 ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400';

                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-3 text-center font-medium text-slate-600 sticky left-0 z-10 bg-white border-r border-slate-100">
                        {formatDate(day, month, year)}
                      </td>
                      <td className={`px-6 py-3 ${valueAlignClass} font-semibold text-slate-700 bg-blue-50/30 border-r border-slate-100`}>
                        {formatNullableCurrencyFr(theorique)}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <CurrencyInput
                            value={dayData[config.realField] || ''}
                            onChange={(val) => onUpdate(day, config.realField, val)}
                            className={`text-slate-700 font-medium ${valueAlignClass}`}
                          />
                        </div>
                      </td>
                      {config.secondaryRealField ? (
                        <td className="px-3 py-2 border-r border-slate-100">
                          <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                            <CurrencyInput
                              value={dayData[config.secondaryRealField] || ''}
                              onChange={(val) => onUpdate(day, config.secondaryRealField as string, val)}
                              className={`text-slate-700 font-medium ${valueAlignClass}`}
                            />
                          </div>
                        </td>
                      ) : null}
                      {config.totalLabel ? (
                        <td className={`px-6 py-3 ${valueAlignClass} font-semibold text-slate-700 border-r border-slate-100`}>
                          {formatNullableCurrencyFr(reel)}
                        </td>
                      ) : null}
                      {config.secondaryTotalLabel ? (
                        <td className={`px-6 py-3 ${valueAlignClass} font-semibold text-slate-700 border-r border-slate-100`}>
                          {formatNullableCurrencyFr(secondaryReel)}
                        </td>
                      ) : null}
                      <td className={`px-6 py-3 ${valueAlignClass} font-bold border-r border-slate-100 ${ecartColor}`}>
                        {(theorique !== 0 || reel !== 0) ? formatCurrencyFr(ecart) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full p-2 bg-transparent outline-none text-slate-600 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200"
                          value={dayData[commentField] || ''}
                          onChange={(e) => onUpdate(day, commentField, e.target.value)}
                          placeholder="Ajouter une note..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-20">
                <tr>
                  <td className="px-6 py-4 text-center rounded-bl-2xl border-r border-slate-700 sticky left-0 z-30 bg-slate-800">TOTAL</td>
                  <td className={`px-6 py-4 ${valueAlignClass} text-blue-200 border-r border-slate-700`}>{formatCurrencyFr(sumTheorique)}</td>
                  <td className={`px-6 py-4 ${valueAlignClass} text-amber-200 border-r border-slate-700`}>{formatCurrencyFr(sumReel)}</td>
                  {config.secondaryRealLabel ? (
                    <td className={`px-6 py-4 ${valueAlignClass} text-amber-200 border-r border-slate-700`}>{formatCurrencyFr(sumSecondaryReel)}</td>
                  ) : null}
                  {config.totalLabel ? (
                    <td className={`px-6 py-4 ${valueAlignClass} border-r border-slate-700`}>{formatCurrencyFr(sumReel)}</td>
                  ) : null}
                  {config.secondaryTotalLabel ? (
                    <td className={`px-6 py-4 ${valueAlignClass} border-r border-slate-700`}>{formatCurrencyFr(sumSecondaryReel)}</td>
                  ) : null}
                  <td className={`px-6 py-4 ${valueAlignClass} border-r border-slate-700 ${sumEcart < -0.001 ? 'text-rose-400' : sumEcart > 0.001 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatCurrencyFr(sumEcart)}
                  </td>
                  <td className="px-6 py-4 rounded-br-2xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
