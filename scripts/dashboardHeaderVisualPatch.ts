import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch visuel banderole dashboard non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardHeaderVisualPatch = (): Plugin => ({
  name: 'dashboard-header-visual-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "<header style={{ background: tableViewMode === 'SAISIE' ? sidebarThemeWide : '#fff', borderBottom: tableViewMode === 'SAISIE' ? '1px solid rgba(125, 211, 252, .24)' : '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 24px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90, position: 'relative', boxShadow: tableViewMode === 'SAISIE' ? '0 14px 32px rgba(15, 23, 42, .20), inset 0 -1px 0 rgba(255,255,255,.06)' : 'none' }}>",
      "<header style={{ background: sidebarThemeWide, borderBottom: '1px solid rgba(125, 211, 252, .24)', padding: isMobile ? '0 16px' : '0 24px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90, position: 'relative', boxShadow: '0 14px 32px rgba(15, 23, 42, .20), inset 0 -1px 0 rgba(255,255,255,.06)' }}>",
      'fond de banderole commun'
    );

    next = replaceRequired(
      next,
      "<div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', minHeight: tableViewMode === 'SAISIE' ? (isMobile ? 86 : 78) : (isMobile ? 58 : 64), padding: tableViewMode === 'SAISIE' ? (isMobile ? '12px 0' : '14px 0 10px') : 0, display: 'flex', alignItems: tableViewMode === 'SAISIE' && isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: tableViewMode === 'SAISIE' && isMobile ? 'column' : 'row' }}>",
      "<div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', minHeight: isMobile ? 86 : 78, padding: isMobile ? '12px 0' : '14px 0 10px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>",
      'placement haut commun'
    );

    next = replaceRequired(
      next,
      "<div style={{ display: 'flex', alignItems: 'center', gap: tableViewMode === 'SAISIE' ? 18 : 12, minWidth: 0 }}>",
      "<div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>",
      'espacement titre commun'
    );

    next = replaceRequired(
      next,
      "<button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: tableViewMode === 'SAISIE' ? '#cbd5e1' : '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0, flexShrink: 0 }}>",
      "<button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0, flexShrink: 0 }}>",
      'retour accueil sombre'
    );

    next = replaceRequired(
      next,
      "<h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>\n                  {monthNames[month]} {year}\n                </h2>",
      "<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(207,250,254,.14)', borderRadius: 14, color: '#fff', padding: isMobile ? '9px 11px' : '10px 14px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}>\n                  <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>{tableViewMode === 'ANALYSE' ? 'Vue analyse' : 'Vue complète'}</span>\n                  <span style={{ fontSize: isMobile ? 21 : 25, fontWeight: 950, textTransform: 'capitalize', lineHeight: 1.1, color: '#fef3c7' }}>{monthNames[month]} {year}</span>\n                </div>",
      'bulle titre mois commun'
    );

    next = replaceRequired(
      next,
      "<div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: tableViewMode === 'SAISIE' ? '0 0 14px' : (isMobile ? '10px 0' : '10px 0 12px'), display: 'flex', gap: 8, background: 'transparent', borderBottom: tableViewMode === 'SAISIE' ? 'none' : '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>",
      "<div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: isMobile ? '0 0 12px' : '0 0 14px', display: 'flex', gap: 8, background: 'transparent', borderBottom: 'none', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>",
      'position bulles vue commune'
    );

    next = replaceRequired(
      next,
      "<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: tableViewMode === 'SAISIE' ? '1px solid rgba(255,255,255,.18)' : '1px solid #e2e8f0', borderRadius: 10, background: tableViewMode === 'SAISIE' ? 'rgba(255,255,255,.10)' : '#f8fafc', flexShrink: 0 }}>",
      "<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: '1px solid rgba(255,255,255,.18)', borderRadius: 10, background: 'rgba(255,255,255,.10)', flexShrink: 0 }}>",
      'fond bulles vue commun'
    );

    next = replaceRequired(
      next,
      "<span style={{ padding: '0 6px', fontSize: 10, fontWeight: 900, color: tableViewMode === 'SAISIE' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vue</span>",
      "<span style={{ padding: '0 6px', fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vue</span>",
      'libelle vue commun'
    );

    next = replaceRequired(
      next,
      "background: isModeActive ? (tableViewMode === 'SAISIE' ? '#fff' : '#0f172a') : 'transparent',\n                      color: isModeActive ? (tableViewMode === 'SAISIE' ? '#0f172a' : '#fff') : (tableViewMode === 'SAISIE' ? '#cbd5e1' : '#475569'),",
      "background: isModeActive ? '#fff' : 'transparent',\n                      color: isModeActive ? '#0f172a' : '#cbd5e1',",
      'couleurs bulles vue communes'
    );

    next = replaceRequired(
      next,
      "background: isActive ? accentBg : '#f8fafc',\n                    border: `1.5px solid ${isActive ? accentBg : '#e2e8f0'}`,\n                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',",
      "background: isActive ? accentBg : 'rgba(255,255,255,.10)',\n                    border: `1.5px solid ${isActive ? accentBg : 'rgba(255,255,255,.18)'}`,\n                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'inset 0 1px 0 rgba(255,255,255,.08)',",
      'couleurs onglets metier communes'
    );

    next = replaceRequired(
      next,
      "background: isActive ? 'rgba(255,255,255,.16)' : '#e2e8f0', color: isActive ? '#fff' : accentBg,",
      "background: isActive ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.14)', color: isActive ? '#fff' : '#cbd5e1',",
      'pastille onglets metier commune'
    );

    next = replaceRequired(
      next,
      "color: isActive ? accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3",
      "color: isActive ? accentColor : '#e2e8f0', letterSpacing: '.02em', lineHeight: 1.3",
      'texte onglets metier commun'
    );

    return { code: next, map: null };
  },
});
