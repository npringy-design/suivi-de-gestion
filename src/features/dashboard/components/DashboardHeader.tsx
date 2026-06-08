import React from 'react';
import { ChevronLeft, Clipboard, Download, FileDown, Trash2, Upload } from 'lucide-react';

import { tabs, viewModes, type TableViewMode } from '@/features/dashboard/dashboardStaticConfig';

export type DashboardHeaderProps = {
  isMobile: boolean;
  onBack: () => void;
  sidebarThemeWide: string;
  weatherTheme: string;
  weatherThemeHover: string;
  actionTileStyle: React.CSSProperties;
  tableViewMode: TableViewMode;
  setTableViewMode: React.Dispatch<React.SetStateAction<TableViewMode>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  monthNames: string[];
  month: number;
  year: number;
  selectedDayLabel: string;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  datePickerRef: React.RefObject<HTMLDivElement | null>;
  renderDatePicker: () => React.ReactNode;
  setIsImportModalOpen: (open: boolean) => void;
  openDailyRecapPreview: () => void;
  dailyRecapStatus: string;
  handleExportPDF: () => void;
  handleExport: () => void;
  handleTemporaryResetLocalData: () => void;
};

export default function DashboardHeader({
  isMobile,
  onBack,
  sidebarThemeWide,
  weatherTheme,
  weatherThemeHover,
  actionTileStyle,
  tableViewMode,
  setTableViewMode,
  activeTab,
  setActiveTab,
  monthNames,
  month,
  year,
  selectedDayLabel,
  isDatePickerOpen,
  setIsDatePickerOpen,
  datePickerRef,
  renderDatePicker,
  setIsImportModalOpen,
  openDailyRecapPreview,
  dailyRecapStatus,
  handleExportPDF,
  handleExport,
  handleTemporaryResetLocalData,
}: DashboardHeaderProps) {
  return (
    <header style={{ background: sidebarThemeWide, borderBottom: '1px solid rgba(125, 211, 252, .24)', padding: isMobile ? '0 16px' : '0 24px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90, position: 'relative', boxShadow: '0 14px 32px rgba(15, 23, 42, .20), inset 0 -1px 0 rgba(255,255,255,.06)' }}>
      <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', minHeight: isMobile ? 86 : 78, padding: isMobile ? '12px 0' : '14px 0 10px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0, flexShrink: 0 }}>
            <ChevronLeft size={16} /> Retour Accueil
          </button>
          {tableViewMode === 'SAISIE' ? (
            <div ref={datePickerRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(prev => !prev)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(207,250,254,.14)', borderRadius: 14, cursor: 'pointer', color: '#fff', padding: isMobile ? '9px 11px' : '10px 14px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}
              >
                <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Saisie journalière</span>
                <span style={{ fontSize: isMobile ? 21 : 25, fontWeight: 950, textTransform: 'capitalize', lineHeight: 1.1, color: '#fef3c7' }}>{selectedDayLabel}</span>
              </button>
              {isDatePickerOpen && renderDatePicker()}
            </div>
          ) : (
            <div ref={datePickerRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(prev => !prev)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(207,250,254,.14)', borderRadius: 14, cursor: 'pointer', color: '#fff', padding: isMobile ? '9px 11px' : '10px 14px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}
              >
                <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>{tableViewMode === 'ANALYSE' ? 'Vue analyse' : 'Vue complète'}</span>
                <span style={{ fontSize: isMobile ? 21 : 25, fontWeight: 950, textTransform: 'capitalize', lineHeight: 1.1, color: '#fef3c7' }}>{monthNames[month]} {year}</span>
              </button>
              {isDatePickerOpen && renderDatePicker()}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: tableViewMode === 'SAISIE' && isMobile ? 'stretch' : 'auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => setIsImportModalOpen(true)} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
            <Upload size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Importer'}
          </button>
          {tableViewMode === 'SAISIE' && (
            <button onClick={openDailyRecapPreview} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme} title={dailyRecapStatus || 'Préparer le récap mail du jour'}>
              <Clipboard size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Récap mail'}
            </button>
          )}
          <button onClick={handleExportPDF} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
            <FileDown size={isMobile ? 14 : 16} /> {isMobile ? '' : 'PDF'}
          </button>
          <button onClick={handleExport} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
            <Download size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Excel'}
          </button>
          {tableViewMode === 'SAISIE' && (
            <button
              type="button"
              onClick={handleTemporaryResetLocalData}
              style={{ ...actionTileStyle, background: '#7f1d1d', borderColor: 'rgba(254, 202, 202, .35)', color: '#fee2e2' }}
              onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
              onMouseLeave={e => e.currentTarget.style.background = '#7f1d1d'}
              title="RAZ provisoire des donnees locales"
            >
              <Trash2 size={isMobile ? 14 : 16} /> {isMobile ? '' : 'RAZ'}
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: isMobile ? '0 0 12px' : '0 0 14px', display: 'flex', gap: 8, background: 'transparent', borderBottom: 'none', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: '1px solid rgba(255,255,255,.18)', borderRadius: 10, background: 'rgba(255,255,255,.10)', flexShrink: 0 }}>
          <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vue</span>
          {viewModes.map(mode => {
            const isModeActive = tableViewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTableViewMode(mode.id)}
                style={{
                  border: 'none',
                  borderRadius: 7,
                  background: isModeActive ? '#fff' : 'transparent',
                  color: isModeActive ? '#0f172a' : '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '6px 9px',
                  whiteSpace: 'nowrap',
                  transition: 'all .15s',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        {tableViewMode !== 'SAISIE' && tableViewMode !== 'ANALYSE' && tabs.map(tab => {
          const isActive = activeTab === tab.id;
          let icon = 'ðŸ“';
          let accentBg = '#475569';
          const accentColor = '#fff';

          switch (tab.id) {
            case 'PREVISIONS': icon = 'PR'; accentBg = '#92400e'; break;
            case 'REALISE': icon = 'RE'; accentBg = '#1e40af'; break;
            case 'COUT_MATIERE': icon = 'CM'; accentBg = '#166534'; break;
            case 'PERSONNEL': icon = 'FP'; accentBg = '#6b21a8'; break;
            case 'FRAIS_GENERAUX': icon = 'FG'; accentBg = '#b45309'; break;
            case 'RESULTATS': icon = 'RM'; accentBg = '#be123c'; break;
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? accentBg : 'rgba(255,255,255,.10)',
                border: `1.5px solid ${isActive ? accentBg : 'rgba(255,255,255,.18)'}`,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'inset 0 1px 0 rgba(255,255,255,.08)',
                transition: 'all .15s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.14)', color: isActive ? '#fff' : '#cbd5e1', fontSize: 9, fontWeight: 900 }}>{icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? accentColor : '#e2e8f0', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
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
  );
}
