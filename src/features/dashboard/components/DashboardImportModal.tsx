import React from 'react';
import { FileSpreadsheet, FileText, Receipt, Upload, Users, X } from 'lucide-react';

import type {
  CaisseImportPreview,
  DashboardColumn,
  HistoricalBudgetPreview,
  InvoiceImportPreview,
} from '@/features/dashboard/dashboardTypes';

export type DashboardImportModalProps = {
  isMobile: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  monthNames: string[];
  dynamicColumns: DashboardColumn[];

  formatImportedIntegerLabel: (value: number) => string;
  formatImportedCurrencyLabel: (value: number, decimals?: number) => string;

  // Feuille de caisse
  handleDailyRealiseImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  caisseImportPreviews: CaisseImportPreview[];
  updateCaisseImportPreview: (id: string, updates: Partial<CaisseImportPreview>) => void;
  applyCaisseImport: (preview: CaisseImportPreview) => void;

  // Facture fournisseur
  handleInvoiceImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  invoiceImportStatus: string;
  invoiceImportPreviews: InvoiceImportPreview[];
  updateInvoiceImportPreview: (id: string, updates: Partial<InvoiceImportPreview>) => void;
  applyInvoiceImport: (preview: InvoiceImportPreview) => void;

  // PDF salaires
  handleSalaryPayrollImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  salaryImportStatus: string;

  // Budget historique Excel V26
  handleHistoricalBudgetExcelImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  historicalBudgetStatus: string;
  historicalBudgetPreviews: HistoricalBudgetPreview[];
  setHistoricalBudgetPreviews: React.Dispatch<React.SetStateAction<HistoricalBudgetPreview[]>>;
  applyHistoricalBudgetExcelImport: () => void;

  // Budget historique Excel V25 (N-1)
  handleHistoricalV25ExcelImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  historicalV25Status: string;
  historicalV25Previews: HistoricalBudgetPreview[];
  setHistoricalV25Previews: React.Dispatch<React.SetStateAction<HistoricalBudgetPreview[]>>;
  applyHistoricalV25ExcelImport: () => void;
  year: number;

  // Statut / aperçu generiques
  importStatus: string;
  importPreview: Array<{ label: string; value: string }>;
};

function ImportRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  onChange,
  accept,
  multiple,
  isLast,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  multiple?: boolean;
  isLast?: boolean;
}) {
  return (
    <>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{badge}</div>
        <input
          type="file"
          accept={accept}
          onChange={onChange}
          multiple={multiple}
          style={{ display: 'none' }}
        />
      </label>
      {!isLast && <div style={{ height: 1, background: '#e2e8f0', margin: '0 16px' }} />}
    </>
  );
}

export default function DashboardImportModal({
  isMobile,
  setIsImportModalOpen,
  monthNames,
  dynamicColumns,
  formatImportedIntegerLabel,
  formatImportedCurrencyLabel,
  handleDailyRealiseImport,
  caisseImportPreviews,
  updateCaisseImportPreview,
  applyCaisseImport,
  handleInvoiceImport,
  invoiceImportStatus,
  invoiceImportPreviews,
  updateInvoiceImportPreview,
  applyInvoiceImport,
  handleSalaryPayrollImport,
  salaryImportStatus,
  handleHistoricalBudgetExcelImport,
  historicalBudgetStatus,
  historicalBudgetPreviews,
  setHistoricalBudgetPreviews,
  applyHistoricalBudgetExcelImport,
  handleHistoricalV25ExcelImport,
  historicalV25Status,
  historicalV25Previews,
  setHistoricalV25Previews,
  applyHistoricalV25ExcelImport,
  year,
  importStatus,
  importPreview,
}: DashboardImportModalProps) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 18 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 'min(680px, 100%)', maxWidth: 'calc(100vw - 36px)', maxHeight: 'calc(100vh - 36px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={20} color="#10b981" />
            Importer des données
          </h3>
          <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: isMobile ? 14 : 20, overflow: 'auto' }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
            Sélectionnez un type d'import ci-dessous.
          </p>

          <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Imports quotidiens
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, marginBottom: 20 }}>
            <ImportRow
              icon={<Receipt size={18} />}
              iconBg="#eff6ff"
              iconColor="#1d4ed8"
              title="Feuille de caisse"
              subtitle="Remplit le CA, VAE et couverts du jour"
              badge="PDF · multi"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={handleDailyRealiseImport}
              multiple
            />
            <ImportRow
              icon={<FileText size={18} />}
              iconBg="#f0fdf4"
              iconColor="#166534"
              title="Facture fournisseur"
              subtitle="Extrait fournisseur, date et montant HT"
              badge="PDF · multi"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={handleInvoiceImport}
              multiple
            />
            <ImportRow
              icon={<Users size={18} />}
              iconBg="#faf5ff"
              iconColor="#7e22ce"
              title="PDF salaires"
              subtitle="Met à jour les taux par statut et section"
              badge="PDF"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={handleSalaryPayrollImport}
              multiple
              isLast
            />
          </div>

          <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Imports historiques
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10 }}>
            <ImportRow
              icon={<FileSpreadsheet size={18} />}
              iconBg="#fffbeb"
              iconColor="#92400e"
              title="Suivi de gestion V26"
              subtitle="Prévisions, réalisé, coûts et frais généraux"
              badge={`Excel · ${year}`}
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleHistoricalBudgetExcelImport}
            />
            <ImportRow
              icon={<FileSpreadsheet size={18} />}
              iconBg="#fffbeb"
              iconColor="#92400e"
              title="Historique N-1 (V25)"
              subtitle="CA, couverts, coûts et frais de l'année précédente"
              badge={`Excel · ${year}`}
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleHistoricalV25ExcelImport}
              isLast
            />
          </div>

          {historicalBudgetStatus && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: historicalBudgetStatus.startsWith('Erreur') ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (historicalBudgetStatus.startsWith('Erreur') ? '#fecaca' : '#fde68a'), color: historicalBudgetStatus.startsWith('Erreur') ? '#991b1b' : '#92400e', fontSize: 13, fontWeight: 800 }}>
              {historicalBudgetStatus}
            </div>
          )}

          {historicalBudgetPreviews.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10, padding: 12, border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em' }}>Prévisualisation budget historique</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                    {historicalBudgetPreviews.length} jours · CA recalculé estimé {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setHistoricalBudgetPreviews([])} style={{ height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 12, fontWeight: 900, cursor: 'pointer', padding: '0 12px' }}>Annuler</button>
                  <button type="button" onClick={applyHistoricalBudgetExcelImport} style={{ height: 34, border: 'none', borderRadius: 8, background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 950, cursor: 'pointer', padding: '0 14px' }}>Valider l'import</button>
                </div>
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto', display: 'grid', gap: 6 }}>
                {historicalBudgetPreviews.slice(0, 40).map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 90px repeat(4, minmax(86px, 1fr))', gap: 8, alignItems: 'center', padding: '8px 10px', border: '1px solid #fde68a', borderRadius: 8, background: '#fff' }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{monthNames[item.month]} {item.day}</div>
                    <div style={{ fontSize: 11, fontWeight: 850, color: '#92400e' }}>{item.sheetName}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.couvertsMidi)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>TM midi {formatImportedCurrencyLabel(item.tmMidi)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.couvertsSoir)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>TM soir {formatImportedCurrencyLabel(item.tmSoir)}</div>
                  </div>
                ))}
                {historicalBudgetPreviews.length > 40 && <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>+ {historicalBudgetPreviews.length - 40} lignes non affichees dans l'aperçu</div>}
              </div>
            </div>
          )}

          {historicalV25Status && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: historicalV25Status.startsWith('Erreur') ? '#fef2f2' : '#f5f3ff', border: '1px solid ' + (historicalV25Status.startsWith('Erreur') ? '#fecaca' : '#c4b5fd'), color: historicalV25Status.startsWith('Erreur') ? '#991b1b' : '#5b21b6', fontSize: 13, fontWeight: 800 }}>
              {historicalV25Status}
            </div>
          )}

          {historicalV25Previews.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10, padding: 12, border: '1px solid #c4b5fd', borderRadius: 10, background: '#f5f3ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Prévisualisation historique V25</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                    {historicalV25Previews.length} jours · CA total {formatImportedCurrencyLabel(historicalV25Previews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalV25Previews.reduce((sum, item) => sum + item.couvertsTotal, 0))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setHistoricalV25Previews([])} style={{ height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 12, fontWeight: 900, cursor: 'pointer', padding: '0 12px' }}>Annuler</button>
                  <button type="button" onClick={applyHistoricalV25ExcelImport} style={{ height: 34, border: 'none', borderRadius: 8, background: '#5b21b6', color: '#fff', fontSize: 12, fontWeight: 950, cursor: 'pointer', padding: '0 14px' }}>Valider l'import V25</button>
                </div>
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto', display: 'grid', gap: 6 }}>
                {historicalV25Previews.slice(0, 40).map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 90px repeat(4, minmax(86px, 1fr))', gap: 8, alignItems: 'center', padding: '8px 10px', border: '1px solid #c4b5fd', borderRadius: 8, background: '#fff' }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{monthNames[item.month]} {item.day}</div>
                    <div style={{ fontSize: 11, fontWeight: 850, color: '#5b21b6' }}>{item.sheetName}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>CA midi {formatImportedCurrencyLabel(item.realiseMidi)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>CA soir {formatImportedCurrencyLabel(item.realiseSoir)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.realiseCouvertsMidi)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.realiseCouvertsSoir)}</div>
                  </div>
                ))}
                {historicalV25Previews.length > 40 && <div style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6' }}>+ {historicalV25Previews.length - 40} lignes non affichees dans l'aperçu</div>}
              </div>
            </div>
          )}

          {salaryImportStatus && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: salaryImportStatus.startsWith('Erreur') ? '#fef2f2' : '#faf5ff', border: `1px solid ${salaryImportStatus.startsWith('Erreur') ? '#fecaca' : '#e9d5ff'}`, color: salaryImportStatus.startsWith('Erreur') ? '#991b1b' : '#6b21a8', fontSize: 13, fontWeight: 800 }}>
              {salaryImportStatus}
            </div>
          )}

          {invoiceImportStatus && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: invoiceImportStatus.startsWith('Erreur') ? '#fef2f2' : invoiceImportStatus.includes('verifier') ? '#fffbeb' : '#f0fdf4', border: `1px solid ${invoiceImportStatus.startsWith('Erreur') ? '#fecaca' : invoiceImportStatus.includes('verifier') ? '#fbbf24' : '#bbf7d0'}`, color: invoiceImportStatus.startsWith('Erreur') ? '#991b1b' : invoiceImportStatus.includes('verifier') ? '#92400e' : '#166534', fontSize: 13, fontWeight: 800 }}>
              {invoiceImportStatus}
            </div>
          )}

          {invoiceImportPreviews.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {invoiceImportPreviews.map(item => {
                const isVerified = item.confidence === 'verified';
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'minmax(140px, 1fr) minmax(140px, 1fr) 116px 104px minmax(150px, 1fr) 112px' : 'minmax(180px, 1.15fr) minmax(150px, 1fr) 130px 110px minmax(190px, 1fr) 112px',
                      gap: 8,
                      alignItems: 'end',
                      minWidth: isMobile ? 840 : 980,
                      padding: 10,
                      border: `1px solid ${isVerified ? '#86efac' : '#fbbf24'}`,
                      borderRadius: 8,
                      background: isVerified ? '#f0fdf4' : '#fffbeb',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 999, background: isVerified ? '#dcfce7' : '#fef3c7', color: isVerified ? '#166534' : '#92400e', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                          {isVerified ? 'OK' : 'A verifier'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: isVerified ? '#166534' : '#92400e', fontWeight: 700 }}>{item.status}</div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Fournisseur</span>
                      <input
                        value={item.supplier}
                        onChange={event => updateInvoiceImportPreview(item.id, { supplier: event.target.value })}
                        style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Date</span>
                      <input
                        type="date"
                        value={item.invoiceDate}
                        onChange={event => updateInvoiceImportPreview(item.id, { invoiceDate: event.target.value })}
                        style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>HT</span>
                      <input
                        value={item.amountHt}
                        onChange={event => updateInvoiceImportPreview(item.id, { amountHt: event.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.') })}
                        style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 900, color: '#0f172a', textAlign: 'right' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Colonne cible</span>
                      <select
                        value={item.targetCol}
                        onChange={event => updateInvoiceImportPreview(item.id, { targetCol: Number(event.target.value) })}
                        style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a', background: '#fff' }}
                      >
                        {Array.from({ length: 13 }, (_, idx) => 45 + idx).map(col => (
                          <option key={col} value={col}>{dynamicColumns[col]?.[2] || `Achat ${col}`}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => applyInvoiceImport(item)}
                      style={{ height: 36, border: 'none', borderRadius: 8, background: isVerified ? '#166534' : '#b45309', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
                    >
                      Valider
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {caisseImportPreviews.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {caisseImportPreviews.map(item => {
                const isVerified = item.confidence === 'verified';
                const theoriqueTotal = item.parsed.theoriqueValues.cb
                  + item.parsed.theoriqueValues.especes
                  + item.parsed.theoriqueValues.amex
                  + item.parsed.theoriqueValues.tr_carte
                  + item.parsed.theoriqueValues.ancv
                  + item.parsed.theoriqueValues.tr_papier
                  + item.parsed.theoriqueValues.sunday
                  + item.parsed.theoriqueValues.uber
                  + item.parsed.theoriqueValues.deliveroo
                  + item.parsed.theoriqueValues.click_collect;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'minmax(150px, 1fr) 130px minmax(250px, 1.2fr) 112px' : 'minmax(190px, 1fr) 138px minmax(420px, 1.5fr) 112px',
                      gap: 8,
                      alignItems: 'end',
                      minWidth: isMobile ? 760 : 960,
                      padding: 10,
                      border: `1px solid ${isVerified ? '#93c5fd' : '#fbbf24'}`,
                      borderRadius: 8,
                      background: isVerified ? '#eff6ff' : '#fffbeb',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 999, background: isVerified ? '#dbeafe' : '#fef3c7', color: isVerified ? '#1d4ed8' : '#92400e', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                          {isVerified ? 'OK' : 'A verifier'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: isVerified ? '#1d4ed8' : '#92400e', fontWeight: 700 }}>{item.status}</div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Date</span>
                      <input
                        type="date"
                        value={item.businessDate}
                        onChange={event => updateCaisseImportPreview(item.id, { businessDate: event.target.value })}
                        style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                      />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                      {[
                        { label: 'VAE HT', value: formatImportedCurrencyLabel(item.parsed.values[17]) },
                        { label: 'CA midi', value: formatImportedCurrencyLabel(item.parsed.values[18]) },
                        { label: 'CA soir', value: formatImportedCurrencyLabel(item.parsed.values[19]) },
                        { label: 'Cts midi', value: formatImportedIntegerLabel(item.parsed.values[25]) },
                        { label: 'Cts soir', value: formatImportedIntegerLabel(item.parsed.values[27]) },
                        { label: 'Theo caisse', value: formatImportedCurrencyLabel(theoriqueTotal) },
                      ].map(metric => (
                        <div key={`${item.id}-${metric.label}`} style={{ padding: '8px 10px', border: '1px solid #dbe5ec', borderRadius: 8, background: '#fff' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{metric.label}</div>
                          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{metric.value}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => applyCaisseImport(item)}
                      style={{ height: 36, border: 'none', borderRadius: 8, background: isVerified ? '#1d4ed8' : '#b45309', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
                    >
                      Valider
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {importStatus && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: importStatus.startsWith('Erreur') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${importStatus.startsWith('Erreur') ? '#fecaca' : '#bbf7d0'}`, color: importStatus.startsWith('Erreur') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 800 }}>
              {importStatus}
            </div>
          )}

          {importPreview.length > 0 && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {importPreview.map(item => (
                <div key={item.label} style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</div>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, marginBottom: 18, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, lineHeight: 1.5, color: '#64748b' }}>
            Si la date du PDF correspond au mois affiche, l'import remplit directement ce jour. Sinon il remplit le jour actuellement selectionne.
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setIsImportModalOpen(false)} style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
