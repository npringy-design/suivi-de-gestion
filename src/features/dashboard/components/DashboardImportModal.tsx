import React from 'react';
import { Upload, X } from 'lucide-react';

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

  // Budget historique Excel
  handleHistoricalBudgetExcelImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  historicalBudgetStatus: string;
  historicalBudgetPreviews: HistoricalBudgetPreview[];
  setHistoricalBudgetPreviews: React.Dispatch<React.SetStateAction<HistoricalBudgetPreview[]>>;
  applyHistoricalBudgetExcelImport: () => void;

  // Statut / aperçu generiques
  importStatus: string;
  importPreview: Array<{ label: string; value: string }>;
};

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
  importStatus,
  importPreview,
}: DashboardImportModalProps) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 18 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 'min(1120px, 100%)', maxWidth: 'calc(100vw - 36px)', maxHeight: 'calc(100vh - 36px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={20} color="#10b981" />
            Importer des donnÃ©es
          </h3>
          <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: isMobile ? 14 : 20, overflow: 'auto' }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 14px' }}>
            Importez une feuille de caisse PDF. Seule la partie realise du suivi quotidien sera remplie :
            VAE, CA midi, CA soir et couverts.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(240px, 1fr))', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #93c5fd', borderRadius: 10, background: '#eff6ff' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Feuille de caisse</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                Lecture locale de plusieurs feuilles possible, avec validation une par une avant application.
              </span>
              <input
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                onChange={handleDailyRealiseImport}
                multiple
                style={{ fontSize: 13, color: '#0f172a' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #86efac', borderRadius: 10, background: '#f0fdf4' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '.04em' }}>Facture fournisseur</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                Lecture locale : fournisseur, date et montant HT. Les fichiers ne sont pas conserves.
              </span>
              <input
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                onChange={handleInvoiceImport}
                multiple
                style={{ fontSize: 13, color: '#0f172a' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #c084fc', borderRadius: 10, background: '#faf5ff' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '.04em' }}>PDF salaires</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                Lit les noms, heures et couts globaux puis met a jour les taux par statut et section.
              </span>
              <input
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                onChange={handleSalaryPayrollImport}
                style={{ fontSize: 13, color: '#0f172a' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #f59e0b', borderRadius: 10, background: '#fffbeb' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em' }}>Budget historique Excel</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                Lit uniquement le mois affichÃ© et importe les prÃ©visions couverts + TM ainsi que le rÃ©alisÃ© CA/couverts. Les totaux restent calculÃ©s par l'application.
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleHistoricalBudgetExcelImport}
                style={{ fontSize: 13, color: '#0f172a' }}
              />
            </label>
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
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em' }}>PrÃ©visualisation budget historique</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                    {historicalBudgetPreviews.length} jours Â· CA recalculÃ© estimÃ© {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} Â· Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}
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
                {historicalBudgetPreviews.length > 40 && <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>+ {historicalBudgetPreviews.length - 40} lignes non affichees dans l'aperÃ§u</div>}
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
          <p style={{ display: 'none', fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
            Pour importer vos donnÃ©es, nous devons dÃ©finir le format exact de votre fichier source.
            Veuillez nous indiquer comment vous souhaitez procÃ©der :
          </p>

          <div style={{ display: 'none', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Option A : Format CSV Standard</h4>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Nous pouvons dÃ©finir un template CSV (colonnes spÃ©cifiques) que vous remplirez et importerez ici.
              </p>
            </div>

            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Option B : Logiciel SpÃ©cifique</h4>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Si vous utilisez un logiciel de caisse ou de gestion (ex: Zelty, Lightspeed, etc.), nous pouvons crÃ©er un importateur sur-mesure pour leur format d'export.
              </p>
            </div>
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
