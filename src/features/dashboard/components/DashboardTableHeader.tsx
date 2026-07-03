import React from 'react';

import type { VisibleDashboardColumn } from '@/features/dashboard/dashboardTypes';
import { accentForGroup, sectionChrome, strongGradient } from '@/lib/tableChrome';

type GroupItem = { name: string; colspan: number; bg: string };
type SubGroupItem = { name: string; group: string; colspan: number; bg: string };

type DashboardTableHeaderProps = {
  visibleColumns: VisibleDashboardColumn[];
  groups: GroupItem[];
  subGroups: SubGroupItem[];
  isEndOfMajorSection: boolean[];
  isEndOfSection: boolean[];
  accent: string;
  thBase: React.CSSProperties;
  activeTab: string;
  tableViewMode: string;
  isMobile: boolean;
  previsionsColspan: number;
  realiseColspan: number;
  otherGroups: GroupItem[];
  updatePurchaseSupplierName: (col: number, value: string) => void;
};

export default function DashboardTableHeader({
  visibleColumns,
  groups,
  subGroups,
  isEndOfMajorSection,
  isEndOfSection,
  accent,
  thBase,
  activeTab,
  tableViewMode,
  isMobile,
  previsionsColspan,
  realiseColspan,
  otherGroups,
  updatePurchaseSupplierName,
}: DashboardTableHeaderProps) {
  return (
    <thead>
      {/* ── ROW 1 : super-sections ── */}
      <tr style={{ height: 30 }}>
        <th rowSpan={4} style={{ ...thBase, background: '#1C1917', color: '#fff', minWidth: isMobile ? 120 : 160, left: 0, top: 0, zIndex: 60, borderRight: '2px solid #475569', borderBottom: '3px solid #374151', padding: isMobile ? '8px 6px' : '16px 12px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100%' }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.15em', color: '#f8fafc' }}>DATE</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buro Monte</span>
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, whiteSpace: 'nowrap' }}>CA N-1 : 159 802 €</span>
            </div>
          </div>
        </th>
        {previsionsColspan > 0 && (
          <th colSpan={previsionsColspan} style={{ ...thBase, background: strongGradient('#d97706'), color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '3px solid #475569', borderBottom: '2px solid #94a3b8' }}>
            PRÉVISIONS
          </th>
        )}
        {realiseColspan > 0 && (
          <th colSpan={realiseColspan} style={{ ...thBase, background: strongGradient('#1e40af'), color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '3px solid #475569', borderBottom: '2px solid #94a3b8' }}>
            {activeTab === 'REALISE' && tableViewMode === 'COMPLET' ? 'RÉALISÉ' : 'RÉALISÉ & ÉVÉNEMENTS'}
          </th>
        )}
        {otherGroups.reduce((a, g) => a + g.colspan, 0) > 0 && (
          <th colSpan={otherGroups.reduce((a, g) => a + g.colspan, 0)} style={{ ...thBase, background: strongGradient('#166534'), color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8' }}>
            GESTION &amp; AUTRES
          </th>
        )}
      </tr>

      {/* ── ROW 2 : groupes ── */}
      <tr style={{ height: 30 }}>
        {groups.map((g, i) => {
          const isEvt = g.name === 'EVENEMENTS RESTAURANTS' || g.name === 'EVENEMENTS NATIONAL';
          let colCount = 0;
          for (let j = 0; j <= i; j++) colCount += groups[j].colspan;
          const isMajorEnd = isEndOfMajorSection[colCount - 1];
          const chrome = sectionChrome(accentForGroup(g.name, accent));

          return (
            <th key={`g-${i}`} colSpan={g.colspan} style={{ ...thBase, background: chrome.headerBg, color: chrome.headerColor, top: 30, height: 30, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : `2px solid ${chrome.headerDivider}`, borderBottom: `1px solid ${chrome.headerBorder}` }}>
              {!isEvt ? g.name : ''}
            </th>
          );
        })}
      </tr>

      {/* ── ROW 3 : sous-groupes ── */}
      <tr style={{ height: 30 }}>
        {subGroups.map((sg, i) => {
          const isEvt = sg.name === 'EVENEMENTS RESTAURANTS' || sg.name === 'EVENEMENTS NATIONAL';
          let colCount = 0;
          for (let j = 0; j <= i; j++) colCount += subGroups[j].colspan;
          const isMajorEnd = isEndOfMajorSection[colCount - 1];
          const chrome = sectionChrome(accentForGroup(sg.group, accent));

          return (
            <th key={`sg-${i}`} colSpan={sg.colspan} style={{ ...thBase, background: chrome.subHeaderBg, color: chrome.subHeaderColor, top: 60, height: 30, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : `2px solid ${chrome.headerDivider}`, borderBottom: `1px solid ${chrome.headerBorder}` }}>
              {!isEvt ? sg.name : ''}
            </th>
          );
        })}
      </tr>

      {/* ── ROW 4 : colonnes ── */}
      <tr style={{ height: 60 }}>
        {visibleColumns.map((c, i) => {
          const isEvt = c[0] === 'EVENEMENTS RESTAURANTS' || c[0] === 'EVENEMENTS NATIONAL';
          const isMajorEnd = isEndOfMajorSection[i];
          const isSectionEnd = isEndOfSection[i];

          const isRmLabel = c[0] === 'RESULTATS MENSUEL HT' && c[2] === 'Indicateur';
          const isRmValue = c[0] === 'RESULTATS MENSUEL HT' && c[2] === 'Valeur';
          const isEditableSupplierHeader = tableViewMode === 'COMPLET' && c.originalIndex >= 45 && c.originalIndex <= 57;
          const minW = isRmLabel ? 180 : isRmValue ? 100 : 65;
          const chrome = sectionChrome(accentForGroup(c[0], accent));

          return (
            <th key={`c-${i}`} style={{ ...thBase, background: chrome.subHeaderBg, color: chrome.subHeaderColor, top: 90, height: 60, minWidth: minW, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : isSectionEnd ? '2px solid #94a3b8' : `1px solid ${chrome.headerDivider}`, borderBottom: '3px solid #374151' }}>
              {isEditableSupplierHeader ? (
                <input
                  value={c[2]}
                  onChange={event => updatePurchaseSupplierName(c.originalIndex, event.target.value)}
                  onClick={event => event.stopPropagation()}
                  title="Modifier le nom du fournisseur"
                  style={{
                    width: '100%',
                    minWidth: 74,
                    height: 42,
                    border: '1px solid #94a3b8',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#0f172a',
                    fontSize: 9,
                    fontWeight: 900,
                    textAlign: 'center',
                    padding: '3px 5px',
                    outline: 'none',
                    textTransform: 'uppercase',
                  }}
                />
              ) : (
                isEvt ? c[0] : c[2]
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
