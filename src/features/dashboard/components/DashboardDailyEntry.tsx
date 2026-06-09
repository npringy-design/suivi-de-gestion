import React, { useState } from 'react';
import { X } from 'lucide-react';

import type { DashboardColumn, DashboardRow } from '@/features/dashboard/dashboardTypes';
import type {
  DayDataNepting,
  DayDataEspeces,
  DayDataAmexAncv,
  DayDataConecs,
  DayDataAncvPapiers,
  DayDataSaisieTR,
  DayDataSunday,
  DayDataUber,
  DayDataDeliveroo,
  DayDataClickCollect,
  TrEntry,
} from '@/contexts/DataContext';
import DashboardCaisseView from '@/features/dashboard/components/DashboardCaisseView';

type DailyControlOptions = { readOnly?: boolean; text?: boolean };
type CashDetailId = 'ancv' | 'tr';

type DebouncedInputComponent = React.ComponentType<any>;

type DashboardDailyEntryProps = {
  selectedDayRow?: DashboardRow;
  selectedDayRowIndex: number;
  selectedDayLabel: string;
  selectedMonthLabel: string;
  isMobile: boolean;
  month: number;
  dynamicColumns: DashboardColumn[];
  dailyRecapStatus: string;
  globalData: Record<number, any>;
  cashInputClass: string;
  DebouncedInput: DebouncedInputComponent;
  parseCaisseNumber: (value: string) => number;
  renderCashAutoValue: (value: string | number, options?: { style?: React.CSSProperties }) => React.ReactNode;
  renderDailyField: (label: string, col: number, options?: DailyControlOptions) => React.ReactNode;
  renderDailySection: (title: string, subtitle: string, fields: React.ReactNode, accent: string) => React.ReactNode;
  renderDailyServiceRow: (label: string, caCol: number, coversCol: number, tmCol: number) => React.ReactNode;
  renderDailySingleRow: (label: string, col: number, options?: DailyControlOptions) => React.ReactNode;
  renderDailyTotalRow: (items: ReadonlyArray<{ label: string; col: number }>) => React.ReactNode;
  renderPersonnelRow: (label: string, cuisineCol: number, salleCol: number) => React.ReactNode;
  renderPersonnelTable: (rows: React.ReactNode) => React.ReactNode;
  dailyPersonnelRows: ReadonlyArray<readonly [string, number, number]>;
  dailyPersonnelTotals: ReadonlyArray<{ label: string; col: number }>;
  updateNepting: (month: number, day: number, field: keyof DayDataNepting, value: string) => void;
  updateEspeces: (month: number, day: number, field: keyof DayDataEspeces, value: string) => void;
  updateAmexAncv: (month: number, day: number, field: keyof DayDataAmexAncv, value: string) => void;
  updateConecs: (month: number, day: number, field: keyof DayDataConecs, value: string) => void;
  updateAncvPapiers: (month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => void;
  updateSaisieTR: (month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string | number) => void;
  updateSunday: (month: number, day: number, field: keyof DayDataSunday, value: string) => void;
  updateUber: (month: number, day: number, field: keyof DayDataUber, value: string) => void;
  updateDeliveroo: (month: number, day: number, field: keyof DayDataDeliveroo, value: string) => void;
  updateClickCollect: (month: number, day: number, field: keyof DayDataClickCollect, value: string) => void;
};

export default function DashboardDailyEntry({
  selectedDayRow,
  selectedDayRowIndex,
  selectedDayLabel,
  selectedMonthLabel,
  isMobile,
  month,
  dynamicColumns,
  dailyRecapStatus,
  globalData,
  cashInputClass,
  DebouncedInput,
  parseCaisseNumber,
  renderCashAutoValue,
  renderDailyField,
  renderDailySection,
  renderDailyServiceRow,
  renderDailySingleRow,
  renderDailyTotalRow,
  renderPersonnelRow,
  renderPersonnelTable,
  dailyPersonnelRows,
  dailyPersonnelTotals,
  updateNepting,
  updateEspeces,
  updateAmexAncv,
  updateConecs,
  updateAncvPapiers,
  updateSaisieTR,
  updateSunday,
  updateUber,
  updateDeliveroo,
  updateClickCollect,
}: DashboardDailyEntryProps) {
  const [expandedCashDetail, setExpandedCashDetail] = useState<CashDetailId | null>(null);
  const [isCashValidationModalOpen, setIsCashValidationModalOpen] = useState(false);
  const [cashValidationDraft, setCashValidationDraft] = useState('');

  if (!selectedDayRow) return null;

  const achatFields = Array.from({ length: 13 }, (_, idx) => 45 + idx).map(col => renderDailyField(dynamicColumns[col]?.[2] || `Achat ${col}`, col));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%', minWidth: 0, maxWidth: 1480, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ background: '#050b18', color: '#fff', borderRadius: 10, padding: isMobile ? 16 : '18px 20px', marginTop: isMobile ? 4 : 24, display: 'none', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Saisie journalière</div>
            <h2 style={{ margin: '4px 0 0', fontSize: isMobile ? 20 : 24, fontWeight: 950, textTransform: 'capitalize' }}>{selectedDayLabel}</h2>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 800 }}>
            {selectedMonthLabel}
          </div>
        </div>

        {dailyRecapStatus && (
          <div style={{ padding: '9px 12px', border: '1px solid #bbf7d0', borderRadius: 9, background: '#f0fdf4', color: '#166534', fontSize: 12, fontWeight: 850 }}>
            {dailyRecapStatus}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(660px, 1.35fr) minmax(420px, .9fr)', gap: 10, alignItems: 'start' }}>
          {renderDailySection('Réel caisse', 'Saisie réelle des encaissements', (
            <DashboardCaisseView
              selectedDayRow={selectedDayRow}
              selectedDayRowIndex={selectedDayRowIndex}
              globalData={globalData}
              month={month}
              isMobile={isMobile}
              expandedCashDetail={expandedCashDetail}
              setExpandedCashDetail={setExpandedCashDetail}
              setCashValidationDraft={setCashValidationDraft}
              setIsCashValidationModalOpen={setIsCashValidationModalOpen}
              cashInputClass={cashInputClass}
              DebouncedInput={DebouncedInput}
              parseCaisseNumber={parseCaisseNumber}
              renderCashAutoValue={renderCashAutoValue}
              updateNepting={updateNepting}
              updateEspeces={updateEspeces}
              updateAmexAncv={updateAmexAncv}
              updateConecs={updateConecs}
              updateAncvPapiers={updateAncvPapiers}
              updateSaisieTR={updateSaisieTR}
              updateSunday={updateSunday}
              updateUber={updateUber}
              updateDeliveroo={updateDeliveroo}
              updateClickCollect={updateClickCollect}
            />
          ), '#0f766e')}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            {renderDailySection('Réalisé', 'Saisie du CA et des couverts par service', (
              <>
                {renderDailySingleRow('VAE', 17, { readOnly: true })}
                {renderDailyServiceRow('Midi', 18, 25, 26)}
                {renderDailyServiceRow('Soir', 19, 27, 28)}
                {renderDailyTotalRow([
                  { label: 'Total CA', col: 21 },
                  { label: 'Total couverts', col: 29 },
                  { label: 'Ticket moyen', col: 30 },
                ])}
              </>
            ), '#2563eb')}

            {renderDailySection('Événements', 'Notes particulières du jour', (
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {renderDailyField('Événement restaurant', 37, { text: true })}
                {renderDailyField('Événement national', 38, { text: true })}
              </div>
            ), '#f59e0b')}

            {renderDailySection('Démarques', 'Personnel, opérationnel et total démarques', (
              <>
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {renderDailyField('Démarque personnel', 39)}
                  {renderDailyField('Démarque opérationnel', 41)}
                  {renderDailyField('Total démarque', 43, { readOnly: true })}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  {renderDailyField('Explication démarque', 44, { text: true })}
                </div>
              </>
            ), '#f59e0b')}
          </div>
        </div>

        {renderDailySection('Personnel', 'Saisie des heures par équipe et masse salariale liée au CA du jour', (
          renderPersonnelTable(
            <>
              {dailyPersonnelRows.map(([label, cuisineCol, salleCol]) => renderPersonnelRow(label, cuisineCol, salleCol))}
              {renderDailyTotalRow(dailyPersonnelTotals)}
            </>
          )
        ), '#9333ea')}

        {renderDailySection('Achats / livraisons', 'Factures fournisseurs reçues dans la journée', (
          <>
            {achatFields}
            {renderDailyTotalRow([
              { label: 'Total achats HT', col: 58 },
            ])}
          </>
        ), '#16a34a')}
      </div>
      {isCashValidationModalOpen && selectedDayRow?.dayIndex ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'rgba(15, 23, 42, .55)' }}>
          <div style={{ width: 'min(520px, 100%)', borderRadius: 14, background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, .28)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 950, color: '#0f172a' }}>Commentaire d'écart caisse</div>
                <div style={{ marginTop: 3, fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'capitalize' }}>{selectedDayLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsCashValidationModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 4 }}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 950, color: '#334155', textTransform: 'uppercase', letterSpacing: '.05em' }}>Commentaire obligatoire</span>
                <textarea
                  value={cashValidationDraft}
                  onChange={event => setCashValidationDraft(event.target.value)}
                  rows={4}
                  style={{ width: '100%', resize: 'vertical', border: '2px solid #fecaca', borderRadius: 10, padding: 10, outline: 'none', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff7ed' }}
                  placeholder="Exemple : écart lié à un ticket papier manquant, correction prévue demain..."
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCashValidationModalOpen(false)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 900, padding: '9px 12px' }}
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  disabled={!cashValidationDraft.trim()}
                  onClick={() => {
                    if (!selectedDayRow?.dayIndex || !cashValidationDraft.trim()) return;
                    updateNepting(month, selectedDayRow.dayIndex, 'commentaire', `Validation caisse : ${cashValidationDraft.trim()}`);
                    setIsCashValidationModalOpen(false);
                  }}
                  style={{ border: 'none', borderRadius: 8, background: cashValidationDraft.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: cashValidationDraft.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 950, padding: '9px 12px' }}
                >
                  Valider avec commentaire
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
