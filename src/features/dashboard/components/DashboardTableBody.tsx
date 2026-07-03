import React from 'react';

import type { DashboardRow, VisibleDashboardColumn } from '@/features/dashboard/dashboardTypes';
import { editableCols } from '@/features/dashboard/dashboardStaticConfig';
import { formatValue, getFgBoxLayout } from '@/features/dashboard/dashboardCalculations';
import { parseMoneyValue } from '@/lib/money';
import { GROUP_ACCENTS, sectionChrome, tint } from '@/lib/tableChrome';
import DebouncedInput from '@/features/dashboard/components/DebouncedInput';

type DragState = { rIdx: number; cIdx: number; endRow: number; value: string };

type DashboardTableBodyProps = {
  rows: DashboardRow[];
  visibleColumns: VisibleDashboardColumn[];
  calculatedData: Record<string, string>;
  cellData: Record<string, string>;
  activeTab: string;
  todayMarker: { year: number; month: number; day: number };
  isEndOfMajorSection: boolean[];
  isEndOfSection: boolean[];
  handleCellChange: (rIdx: number, cIdx: number, value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => void;
  handleDragStart: (e: React.MouseEvent, rIdx: number, cIdx: number, value: string) => void;
  handleDragMove: (rIdx: number) => void;
  dragState: DragState | null;
  focusedCell: string | null;
  setFocusedCell: (key: string | null) => void;
  month: number;
  updateDashboard: (month: number, key: string, value: string) => void;
  fgBoxNames: string[][];
  accent: string;
  ACCENT_GOLD: string;
  HEADER_BG: string;
};

export default function DashboardTableBody({
  rows,
  visibleColumns,
  calculatedData,
  cellData,
  activeTab,
  todayMarker,
  isEndOfMajorSection,
  isEndOfSection,
  handleCellChange,
  handleKeyDown,
  handleDragStart,
  handleDragMove,
  dragState,
  focusedCell,
  setFocusedCell,
  month,
  updateDashboard,
  fgBoxNames,
  accent,
  ACCENT_GOLD,
  HEADER_BG,
}: DashboardTableBodyProps) {
  const chrome = sectionChrome(accent);
  const fraisGenerauxChrome = sectionChrome(GROUP_ACCENTS['FRAIS GENERAUX']);
  return (
<tbody>
  {rows.map((row, rIdx) => {
    const isTotalRow = row.type === 'total';
    const isMonthTotal = row.type === 'month_total';
    const isFgBox4Total = row.type === 'fg_box4_total';
    const isTodayRow = row.type === 'day'
      && row.dateObj?.getFullYear() === todayMarker.year
      && row.dateObj?.getMonth() === todayMarker.month
      && row.dateObj?.getDate() === todayMarker.day;

    // Ligne dédiée au total du box 4 FG — rendu spécial sans aucune bordure épaisse
    if (isFgBox4Total) {
      if (activeTab !== 'FRAIS_GENERAUX') return null;
      const fraisGenerauxStartIdx = visibleColumns.findIndex(col => col[0] === 'FRAIS GENERAUX');
      const fraisGenerauxEndIdx = visibleColumns.map(col => col[0]).lastIndexOf('FRAIS GENERAUX');
      const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
      return (
        <tr key={`r-${rIdx}`}>
          {/* Cellule date sticky — vide, fond blanc, bordure fine */}
          <td className="sticky left-0 z-30 bg-[#ffffff] border-r-[2px] border-r-slate-600 border-b border-b-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]"/>
          {visibleColumns.map((c, cIdx) => {
            const isFraisGeneraux = c[0] === 'FRAIS GENERAUX';
            if (!isFraisGeneraux) {
              // Colonne non-FG : cellule vide avec bordures fines normales
              const isMajorEnd = isEndOfMajorSection[cIdx];
              const isSectEnd = isEndOfSection[cIdx];
              const bR = isMajorEnd ? 'border-r-[3px] border-r-slate-600' : isSectEnd ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200';
              return <td key={`c-${rIdx}-${cIdx}`} className={`bg-white border-b border-b-slate-200 ${bR}`}/>;
            }
            // Colonne FG : déléguer au getFgBoxLayout
            const colGroup = Math.floor((cIdx - fraisGenerauxStartIdx) / 4);
            const colIndexInGroup = (cIdx - fraisGenerauxStartIdx) % 4;
            if (colIndexInGroup === 0) {
              const totalVal = calculatedData[`fg-total-3-${colGroup}`] || '0,00 €';
              const bR = 'border-r-[2px] border-r-slate-500';
              return (
                <td key={`c-${rIdx}-${cIdx}`} colSpan={4}
                  className={`px-3 py-1.5 border-b border-b-slate-300 ${bR}`}
                  style={{ background: ACCENT_GOLD + '44', color: HEADER_BG }}>
                  <div className="flex justify-between font-black text-[10px] uppercase tracking-widest">
                    <span>TOTAL</span>
                    <span>{totalVal}</span>
                  </div>
                </td>
              );
            }
            return null;
          })}
        </tr>
      );
    }
    
    let rowClasses = 'transition-colors hover:bg-blue-50/30';
    let rowStyle: React.CSSProperties | undefined;
    if (isTotalRow) { rowClasses = 'font-bold'; rowStyle = { background: tint(accent, 0.07) }; }
    if (isMonthTotal) { rowClasses = 'font-bold'; rowStyle = { background: tint(accent, 0.12) }; }
    if (isTodayRow) { rowClasses = 'transition-colors'; rowStyle = { background: tint(accent, 0.06) }; }

    let rowBorderClasses = '';
    if (isTotalRow) rowBorderClasses = 'border-y-2 border-y-slate-400';
    if (isMonthTotal) rowBorderClasses = 'border-y-2';
    if (isTodayRow) rowBorderClasses = 'border-y-2';

    // Colonne DATE : dégradé teinté façon Récap Annuel pour les jours normaux ;
    // les codes couleur métier (férié, événement, vacances, week-end) sont conservés.
    // Fond blanc opaque en couche de base : la cellule est sticky, un rgba seul laisserait
    // transparaître les colonnes qui défilent dessous.
    let dateCellBg = 'text-slate-700';
    let dateCellStyle: React.CSSProperties | undefined = { background: `linear-gradient(135deg, ${tint(accent, 0.26)} 0%, ${tint(accent, 0.12)} 48%, #fafaf9 100%), #ffffff` };
    if (isTotalRow) { dateCellBg = 'text-slate-900 font-bold'; dateCellStyle = { background: `linear-gradient(${tint(accent, 0.18)}, ${tint(accent, 0.18)}), #ffffff` }; }
    else if (isMonthTotal) { dateCellBg = 'text-white font-bold'; dateCellStyle = { background: chrome.totalBg, borderTopColor: tint(accent, 0.65), borderBottomColor: tint(accent, 0.65) }; }
    else if (isTodayRow) { dateCellBg = 'text-white font-black'; dateCellStyle = { background: chrome.totalBg, borderTopColor: tint(accent, 0.65), borderBottomColor: tint(accent, 0.65) }; }
    else if (row.isPublicHoliday) { dateCellBg = 'bg-red-100 text-red-800 font-bold'; dateCellStyle = undefined; }
    else if (row.isCustomEvent) { dateCellBg = 'bg-green-200 text-green-900 font-bold'; dateCellStyle = undefined; }
    else if (row.isSchoolHoliday) { dateCellBg = 'bg-blue-200 text-blue-900 font-bold'; dateCellStyle = undefined; }
    else if (row.isWeekend) { dateCellBg = 'bg-[#f8fafc] text-slate-400 italic'; dateCellStyle = undefined; }

    return (
      <tr key={`r-${rIdx}`} className={rowClasses} style={rowStyle}>
        <td style={dateCellStyle} className={[
          'sticky left-0 z-30 px-3 py-1.5 text-right font-medium whitespace-nowrap',
          'border-r-[2px] border-r-slate-600',
          'border-b border-b-slate-100',
          'shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] text-[10px]',
          rowBorderClasses,
          dateCellBg
        ].join(' ')}>
          {isTodayRow ? `${row.label} - aujourd'hui` : row.label}
        </td>

        {visibleColumns.map((c, cIdx) => {
          const originalCIdx = c.originalIndex;
          const isHatched = c[3] === 'bg-hatched';
          let cellBg = isHatched ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=")]' : c[3];
          
          const isFraisGeneraux = c[0] === 'FRAIS GENERAUX';
          const fraisGenerauxStartIdx = visibleColumns.findIndex(col => col[0] === 'FRAIS GENERAUX');
          const fraisGenerauxEndIdx = visibleColumns.map(col => col[0]).lastIndexOf('FRAIS GENERAUX');

          if (isTotalRow && !isHatched && !isFraisGeneraux) cellBg = 'bg-transparent';
          if (isTotalRow && !isHatched && isFraisGeneraux) cellBg = 'bg-white ' + cellBg;
          if (isMonthTotal && !isHatched) cellBg = 'bg-transparent';

          const cellKey = `${rIdx}-${originalCIdx}`;
          const val = calculatedData[cellKey] || '';
          const displayVal = formatValue(val, [c[0], c[1], c[2], c[3]], originalCIdx);
          const isFocused = focusedCell === cellKey;
          
          const isEditableCol = editableCols.includes(originalCIdx) || c[0] === 'FRAIS GENERAUX' || c[0] === 'CONTRAT MENSUALISES';
          const isReadOnly = isTotalRow || isMonthTotal || !isEditableCol;

          const isMajorEndCell = isEndOfMajorSection[cIdx];
          const isSectionEndCell = isEndOfSection[cIdx];
          let cellBorderClasses = 'border-b border-b-slate-200';
          if (isMajorEndCell)      cellBorderClasses += ' border-r-[3px] border-r-slate-600';
          else if (isSectionEndCell) cellBorderClasses += ' border-r-[2px] border-r-slate-400';
          else                      cellBorderClasses += ' border-r border-r-slate-200';
          
          if (isTotalRow)    cellBorderClasses += ' border-y-2 border-y-slate-400';
          if (isMonthTotal) cellBorderClasses += ' border-y-2';

          let textColorClass = isMonthTotal ? 'text-slate-900' : 'text-slate-800';
          const isVarianceCol = c[1].includes('ECART') || c[2].includes('ECART') || [22, 31, 33, 117, 122, 118, 119, 123, 124, 128, 129, 141, 142].includes(originalCIdx);
          if ((c[2] === 'ECART AU\nBUDGET\nJOUR' || isVarianceCol) && val !== '') {
            const numVal = parseMoneyValue(val);
            if (numVal > 0) {
              textColorClass = 'text-emerald-800 font-bold';
              if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-emerald-50';
            } else if (numVal < 0) {
              textColorClass = 'text-red-800 font-bold';
              if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-red-50';
            }
          }

          if (isFraisGeneraux) {
            // Sur la ligne TOTAL mensuel : afficher le total global FG sur toute la largeur FG
            if (isMonthTotal) {
              const fgColSpan = fraisGenerauxEndIdx - fraisGenerauxStartIdx + 1;
              if (cIdx === fraisGenerauxStartIdx) {
                const totalVal = calculatedData[`${rIdx}-fraisGenerauxTotal`] || '0,00 €';
                return (
                  <td key={`c-${rIdx}-${cIdx}`} colSpan={fgColSpan}
                    className="text-center font-black text-sm py-2 px-4 uppercase tracking-widest border-y-2 border-r-[3px] border-r-slate-600"
                    style={{ background: fraisGenerauxChrome.totalBg, color: '#fff', borderTopColor: tint(GROUP_ACCENTS['FRAIS GENERAUX'], 0.65), borderBottomColor: tint(GROUP_ACCENTS['FRAIS GENERAUX'], 0.65) }}>
                    TOTAL FRAIS GÉNÉRAUX : {totalVal}
                  </td>
                );
              }
              // Les colonnes FG suivantes sont absorbées par le colSpan ci-dessus
              return null;
            }

            const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
            const fgLayout = getFgBoxLayout(rIdx, monthTotalIdx);
            
            if (fgLayout) {
              const colGroup = Math.floor((cIdx - fraisGenerauxStartIdx) / 4);
              const colIndexInGroup = (cIdx - fraisGenerauxStartIdx) % 4;
              const boxName = fgBoxNames[fgLayout.box][colGroup];

              if (fgLayout.type === 'header') {
                if (colIndexInGroup === 0) {
                  const bR = 'border-r-[2px] border-r-slate-400';
                  return (
                    <td key={`c-${rIdx}-${cIdx}`} colSpan={4} className={`px-2 py-1.5 text-center font-bold text-[10px] uppercase tracking-wider bg-[#dce6f0] text-slate-800 border-b border-b-slate-300 ${bR}`}>
                      {boxName}
                    </td>
                  );
                }
                return null;
              }

              if (fgLayout.type === 'subheader') {
                const subHeaders = ['DATE', 'FOURNISSEUR', 'MOTIF ACHAT', 'MONTANT HT'];
                const fgSubBorder = `border-b border-b-slate-300 ${colIndexInGroup === 3 ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200'}`;
                return (
                  <td key={`c-${rIdx}-${cIdx}`} className={`px-1 py-1 text-center font-bold text-[9px] bg-[#e9eef7] text-slate-700 ${fgSubBorder}`}>
                    {subHeaders[colIndexInGroup]}
                  </td>
                );
              }

              if (fgLayout.type === 'total') {
                if (colIndexInGroup === 0) {
                  const totalVal = calculatedData[`fg-total-${fgLayout.box}-${colGroup}`] || '0,00 €';
                  const bR = 'border-r-[2px] border-r-slate-400';
                  return (
                    <td key={`c-${rIdx}-${cIdx}`} colSpan={4}
                      className={`px-3 py-1.5 border-b border-b-slate-300 ${bR}`}
                      style={{ background: '#fef3c7', color: '#1e293b' }}>
                      <div className="flex justify-between font-black text-[10px] uppercase tracking-widest">
                        <span>TOTAL</span>
                        <span>{totalVal}</span>
                      </div>
                    </td>
                  );
                }
                return null;
              }

              // data cell inside frais généraux
              const fgCellKey = `fg-data-${fgLayout.box}-${colGroup}-${fgLayout.dataIdx}-${colIndexInGroup}`;
              const fgVal = cellData[fgCellKey] || '';
              const isFgFocused = focusedCell === fgCellKey;
              // Bordure droite : épaisse après la dernière colonne de chaque groupe (MONTANT HT), fine sinon
              const fgCellBorder = `border-b border-b-slate-200 ${colIndexInGroup === 3 ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200'}`;
              return (
                <td key={`c-${rIdx}-${cIdx}`} className={`p-0 bg-white ${fgCellBorder} relative text-center`}>
                  <DebouncedInput
                    dataRow={rIdx}
                    dataCol={cIdx}
                    value={isFgFocused ? fgVal : (colIndexInGroup === 3 && fgVal ? formatValue(fgVal, ['FRAIS GENERAUX', '', 'MONTANT HT']) : fgVal)}
                    onChange={value => {
                      const nextValue = String(value);
                      if (colIndexInGroup === 3) {
                        const cleanValue = nextValue.replace(/[^0-9.,-]/g, '').replace(',', '.');
                        updateDashboard(month, fgCellKey, cleanValue);
                      } else {
                        updateDashboard(month, fgCellKey, nextValue);
                      }
                    }}
                    onFocus={() => setFocusedCell(fgCellKey)}
                    onBlur={() => setFocusedCell(null)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                    className="w-full h-full min-h-[26px] bg-transparent outline-none px-1 text-center font-medium focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 focus:z-10 relative cursor-text text-[10px] text-slate-700 placeholder-slate-300 transition-all"
                    placeholder=""
                  />
                </td>
              );
            }
          }

          // ── RESULTATS MENSUEL HT ─────────────────────────────────────
          if (c[0] === 'RESULTATS MENSUEL HT') {
            const isLabelCol = c[2] === 'Indicateur';
            const isValueCol = c[2] === 'Valeur';
            const rightBorder = isValueCol ? 'border-r-[3px] border-r-slate-600' : 'border-r border-r-slate-300';

            // Structure complète : chaque rIdx mappe sur une ligne définie
            type RmRowType = { type: string; label?: string; key?: string; style?: string };
            const rmDef: RmRowType[] = [
              // CA (lignes 0-8)
              { type: 'section', label: 'CA' },
              { type: 'data', label: 'CA HT RÉALISÉ',          key: 'ca_realise',    style: 'red' },
              { type: 'data', label: 'CA BUDGET',              key: 'ca_budget',     style: 'normal' },
              { type: 'data', label: 'VAR % N-1',              key: 'var_n1',        style: 'normal' },
              { type: 'spacer' },
              { type: 'data', label: 'DIFFÉRENCE N-1',         key: 'diff_n1',       style: 'normal' },
              { type: 'data', label: 'DIFFÉRENCE BUDGET',      key: 'diff_budget',   style: 'normal' },
              { type: 'spacer' },
              // COUVERTS (lignes 8-16)
              { type: 'section', label: 'COUVERTS' },
              { type: 'data', label: 'COUVERTS RESTAURANT MOIS',          key: 'cvts_resto',     style: 'normal' },
              { type: 'data', label: 'MOYENNE COUVERTS JOURS RESTAURANT', key: 'moy_cvts_resto', style: 'normal' },
              { type: 'data', label: 'TM RESTAURANT MOIS',                key: 'tm_resto',       style: 'normal' },
              { type: 'data', label: 'COUVERTS LIMONADE MOIS',            key: 'cvts_limo',      style: 'normal' },
              { type: 'data', label: 'MOYENNE COUVERTS JOURS LIMONADE',   key: 'moy_cvts_limo',  style: 'normal' },
              { type: 'data', label: 'TM LIMONADE MOIS',                  key: 'tm_limo',        style: 'normal' },
              { type: 'spacer' },
              // MARGE (lignes 16-31)
              { type: 'section', label: 'MARGE' },
              { type: 'data',   label: 'STOCK INITIAL',              key: 'rm_stock_init',  style: 'normal' },
              { type: 'edit',   label: 'STOCK FINAL',                key: 'rm_stock_final', style: 'normal' },
              { type: 'data',   label: 'VARIATION DE STOCK',         key: 'var_stock',      style: 'normal' },
              { type: 'spacer' },
              { type: 'data',   label: 'TOTAL ACHAT HORS METRO',     key: 'rm_achat_hm',    style: 'normal' },
              { type: 'data',   label: 'TOTAL ACHAT',                key: 'rm_achat_total', style: 'normal' },
              { type: 'spacer' },
              { type: 'data',   label: 'RATIO FOOD OBJECTIF',        key: 'ratio_obj',      style: 'normal' },
              { type: 'data',   label: 'CONSOMMATION OBJECTIF',      key: 'conso_obj',      style: 'normal' },
              { type: 'data',   label: 'RATIO RÉEL',                 key: 'ratio_reel',     style: 'red' },
              { type: 'data',   label: 'MARGE RÉEL',                 key: 'marge_reel',     style: 'red' },
              { type: 'data',   label: 'CONSOMMATION RÉEL',          key: 'conso_reel',     style: 'red' },
              { type: 'data',   label: 'ÉCART RATIO VS OBJECTIF',    key: 'ecart_ratio',    style: 'normal' },
              { type: 'data',   label: 'ÉCART CONSOMMATION VS OBJECTIF', key: 'ecart_conso', style: 'normal' },
              { type: 'spacer' },
              // S/C (lignes 32-42)
              { type: 'section', label: 'S/C' },
              { type: 'data',   label: 'NB HEURES BUDGET',        key: 'nb_h_budget',  style: 'normal' },
              { type: 'data',   label: 'S/C OBJECTIF',            key: 'sc_obj',       style: 'normal' },
              { type: 'data',   label: 'PRODUCTIVITÉ BUDGET',     key: 'prod_budget',  style: 'normal' },
              { type: 'spacer' },
              { type: 'data',   label: 'NB HEURE RÉEL',           key: 'nb_h_reel',    style: 'red' },
              { type: 'data',   label: 'ÉCART VS BUDGET',         key: 'ecart_h',      style: 'normal' },
              { type: 'data',   label: 'S/C RÉEL',                key: 'sc_reel',      style: 'normal' },
              { type: 'data',   label: 'ÉCART S/C VS BUDGET',     key: 'ecart_sc',     style: 'normal' },
              { type: 'data',   label: 'PROD RÉEL',               key: 'prod_reel',    style: 'red' },
              { type: 'spacer' },
              // FRAIS GÉNÉRAUX (lignes 43+)
              { type: 'section', label: 'FRAIS GÉNÉRAUX RÉALISÉ' },
              { type: 'data',   label: 'Entretien et réparations',   key: 'fg_0',  style: 'normal' },
              { type: 'data',   label: 'Petit matériel et vaisselle', key: 'fg_1', style: 'normal' },
              { type: 'data',   label: 'Tenue du personnel',          key: 'fg_2', style: 'normal' },
              { type: 'data',   label: 'Animation',                   key: 'fg_3', style: 'normal' },
              { type: 'spacer' },
              { type: 'data',   label: 'Ecolab / Diversey',           key: 'fg_4', style: 'normal' },
              { type: 'data',   label: 'Marketing local',             key: 'fg_5', style: 'normal' },
              { type: 'data',   label: 'HACCP Divers',                key: 'fg_6', style: 'normal' },
              { type: 'data',   label: 'Matériel de bureau',          key: 'fg_7', style: 'normal' },
              { type: 'data',   label: 'Énergie',                     key: 'fg_8', style: 'normal' },
              { type: 'data',   label: 'Frais de transport',          key: 'fg_9', style: 'normal' },
              { type: 'data',   label: 'Autres frais',                key: 'fg_10', style: 'normal' },
              { type: 'data',   label: 'Divers',                      key: 'fg_11', style: 'normal' },
            ];

            const rmRow = rmDef[rIdx] as RmRowType | undefined;
            if (!rmRow) {
              return <td key={`c-${rIdx}-${cIdx}`} className={`border-b border-b-slate-100 bg-[#fffdf5] ${rightBorder}`} />;
            }

            // Calculs
            const mtIdx = rows.findIndex(r => r.type === 'month_total');
            const CA_BUDGET = 107967;
            const CA_N1 = 159802;
            const fg = (b: number, g: number) => parseMoneyValue(calculatedData[`fg-total-${b}-${g}`]);
            const caR  = parseMoneyValue(calculatedData[`${mtIdx}-24`]);
            const cvtsMidi = parseMoneyValue(calculatedData[`${mtIdx}-6`]);
            const cvtsSoir = parseMoneyValue(calculatedData[`${mtIdx}-8`]);
            const cvtsResto = cvtsMidi + cvtsSoir;
            const cvtsLimo  = parseMoneyValue(calculatedData[`${mtIdx}-14`]);
            const caLimo    = parseMoneyValue(calculatedData[`${mtIdx}-2`]);
            const wDays = rows.filter(r => r.type === 'day' && !r.isWeekend).length;
            const stockInit  = parseMoneyValue(cellData['rm_stock_init']);
            const stockFinal = parseMoneyValue(cellData['rm_stock_final']);
            const varStock   = stockFinal - stockInit;
            const achatHM    = parseMoneyValue(cellData['rm_achat_hm']);
            const achatTotal = parseMoneyValue(cellData['rm_achat_total']);
            const ratioObj   = 24.50;
            const consoObj   = caR * (ratioObj / 100);
            const consoReel  = achatTotal + varStock;
            const ratioReel  = caR > 0 ? (consoReel / caR) * 100 : 0;
            const margeReel  = caR - consoReel;
            const nbHBudget  = parseMoneyValue(calculatedData[`${mtIdx}-61`]);
            const coutProj   = parseMoneyValue(calculatedData[`${mtIdx}-72`]);
            const nbHReel    = parseMoneyValue(calculatedData[`${mtIdx}-76`]);
            const coutReel   = parseMoneyValue(calculatedData[`${mtIdx}-87`]);

            const f = (n: number, dec = 2) => n.toFixed(dec).replace('.', ',');
            const eur = (n: number) => f(n) + ' €';

            const rmValues: Record<string, string> = {
              ca_realise:    eur(caR),
              ca_budget:     eur(CA_BUDGET),
              var_n1:        CA_N1 > 0 ? f((caR/CA_N1 - 1)*100) + '%' : '',
              diff_n1:       eur(caR - CA_N1),
              diff_budget:   eur(caR - CA_BUDGET),
              cvts_resto:    cvtsResto.toFixed(0),
              moy_cvts_resto:wDays > 0 ? (cvtsResto/wDays).toFixed(0) : '0',
              tm_resto:      cvtsResto > 0 ? eur(caR / cvtsResto) : '',
              cvts_limo:     cvtsLimo.toFixed(0),
              moy_cvts_limo: wDays > 0 ? (cvtsLimo/wDays).toFixed(0) : '0',
              tm_limo:       cvtsLimo > 0 ? eur(caLimo / cvtsLimo) : '',
              rm_stock_init: stockInit ? eur(stockInit) : '0,00 €',
              rm_stock_final:stockFinal ? eur(stockFinal) : '',
              var_stock:     f(varStock, 0),
              rm_achat_hm:   achatHM  ? eur(achatHM)  : '0,00 €',
              rm_achat_total:achatTotal ? eur(achatTotal) : '0,00 €',
              ratio_obj:     ratioObj.toFixed(2) + '%',
              conso_obj:     eur(consoObj),
              ratio_reel:    f(ratioReel) + '%',
              marge_reel:    eur(margeReel),
              conso_reel:    eur(consoReel),
              ecart_ratio:   f(ratioReel - ratioObj),
              ecart_conso:   f(consoReel - consoObj, 0),
              nb_h_budget:   nbHBudget ? f(nbHBudget) : '',
              sc_obj:        caR > 0 ? f((coutProj/caR)*100) + '%' : '',
              prod_budget:   nbHBudget > 0 ? f(caR/nbHBudget) : '',
              nb_h_reel:     nbHReel ? f(nbHReel) : '',
              ecart_h:       f(nbHReel - nbHBudget),
              sc_reel:       caR > 0 ? f((coutReel/caR)*100) + '%' : '',
              ecart_sc:      caR > 0 ? f(((coutReel-coutProj)/caR)*100) + '%' : '',
              prod_reel:     nbHReel > 0 ? f(caR/nbHReel) : '',
              fg_0:  eur(fg(0,0)), fg_1: eur(fg(1,0)),  fg_2: eur(fg(2,0)),
              fg_3:  eur(fg(3,0)), fg_4: eur(fg(0,1)),  fg_5: eur(fg(0,2)),
              fg_6:  eur(fg(1,1)), fg_7: eur(fg(2,1)),  fg_8: eur(fg(2,2)),
              fg_9:  eur(fg(3,1)), fg_10: eur(fg(1,2)), fg_11: eur(fg(3,2)),
            };

            const isRed = rmRow.style === 'red';
            const dispVal = rmRow.key ? (rmValues[rmRow.key] || '') : '';
            const isEditRow = rmRow.type === 'edit';
            const BG_NORMAL = '#fffdf5';
            const BG_SC     = '#fce4d6';
            const BG_SECT   = '#b4c6e7';

            if (rmRow.type === 'section') {
              if (!isLabelCol) return null;
              return (
                <td key={`c-${rIdx}-${cIdx}`} colSpan={2}
                  className="px-2 py-1.5 text-center font-black text-[10px] uppercase tracking-widest border-b border-b-slate-400 border-r-[3px] border-r-slate-600"
                  style={{ background: BG_SECT, color: '#1e2d40' }}>
                  {rmRow.label}
                </td>
              );
            }

            if (rmRow.type === 'spacer') {
              return <td key={`c-${rIdx}-${cIdx}`} className={`bg-[#fffdf5] border-b border-b-slate-100 ${rightBorder}`} style={{ height: 5 }} />;
            }

            const isSC = (rIdx >= 33 && rIdx <= 42);
            const bg = isSC ? BG_SC : BG_NORMAL;

            return (
              <td key={`c-${rIdx}-${cIdx}`}
                className={`border-b border-b-slate-200 ${rightBorder}`}
                style={{ background: bg }}>
                {isLabelCol ? (
                  <span className={`block px-2 py-1 text-[9px] leading-tight ${isRed ? 'font-bold text-red-600' : 'font-medium text-slate-700'}`}>
                    {rmRow.label}
                  </span>
                ) : isEditRow ? (
                  <DebouncedInput
                    dataRow={rIdx}
                    dataCol={cIdx}
                    value={focusedCell === rmRow.key ? (cellData[rmRow.key!] || '') : (cellData[rmRow.key!] ? eur(parseMoneyValue(cellData[rmRow.key!])) : '')}
                    onChange={value => updateDashboard(month, rmRow.key!, String(value).replace(/[^0-9.,]/g,'').replace(',','.'))}
                    onFocus={() => setFocusedCell(rmRow.key!)}
                    onBlur={() => setFocusedCell(null)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                    className="w-full bg-transparent outline-none text-center text-[10px] text-slate-700 focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 px-1 py-1"
                    placeholder=""
                  />
                ) : (
                  <span className={`block text-center px-1 py-1 text-[10px] ${isRed ? 'font-bold text-red-600' : 'text-slate-700'}`}>
                    {dispVal}
                  </span>
                )}
              </td>
            );
          }

          const isDragOver = dragState && row.type === 'day' && rIdx > dragState.rIdx && rIdx <= dragState.endRow && originalCIdx === dragState.cIdx;
          const showHandle = row.type === 'day' && !dragState && !isHatched && !isReadOnly && focusedCell === cellKey;
          return (
            <td
              key={`c-${rIdx}-${cIdx}`}
              className={`p-0 ${cellBg} ${cellBorderClasses} relative text-center`}
              style={isDragOver ? { background: '#dcfce7', outline: '1px solid #16a34a' } : isMonthTotal ? { borderTopColor: tint(accent, 0.65), borderBottomColor: tint(accent, 0.65) } : undefined}
              onMouseEnter={() => dragState && row.type === 'day' && handleDragMove(rIdx)}
            >
              {!isHatched && !isReadOnly ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <DebouncedInput
                    dataRow={rIdx}
                    dataCol={cIdx}
                    value={isFocused ? val : displayVal}
                    onChange={value => handleCellChange(rIdx, originalCIdx, String(value))}
                    onFocus={() => setFocusedCell(cellKey)}
                    onBlur={() => setFocusedCell(null)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                    className="w-full h-full min-h-[26px] bg-transparent outline-none px-1 text-center font-medium focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 focus:z-10 relative cursor-text text-[10px] text-slate-700 placeholder-slate-300 transition-all"
                    placeholder=""
                  />
                  {showHandle && (
                    <div
                      onMouseDown={(e) => handleDragStart(e, rIdx, originalCIdx, String(cellData[cellKey] || ''))}
                      style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, background: '#000000', border: '1px solid #ffffff', borderRadius: 1, cursor: 'crosshair', zIndex: 20 }}
                      title="Glisser pour recopier vers le bas"
                    />
                  )}
                </div>
              ) : !isHatched && isReadOnly ? (
                <div className={`px-1 text-center py-1.5 min-h-[26px] text-[10px] ${val ? textColorClass : 'text-slate-400'}`}>
                  {displayVal || ''}
                </div>
              ) : null}
            </td>
          );
        })}
      </tr>
    );
  })}
</tbody>
  );
}
