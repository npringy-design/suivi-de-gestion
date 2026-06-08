import React from 'react';
import { Clipboard, X } from 'lucide-react';

export type DashboardDailyRecapModalProps = {
  isMobile: boolean;
  setIsDailyRecapModalOpen: (open: boolean) => void;
  recapPreviewRef: React.RefObject<HTMLDivElement>;
  dailyRecapManagers: { midi: string; soir: string };
  setDailyRecapManagers: React.Dispatch<React.SetStateAction<{ midi: string; soir: string }>>;
  dailyRecapServiceComments: { midi: string; soir: string };
  setDailyRecapServiceComments: React.Dispatch<React.SetStateAction<{ midi: string; soir: string }>>;
  dailyRecapGoogleRatings: Record<number, string>;
  setDailyRecapGoogleRatings: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  buildDailyRecapHtml: (options: { managerMidi?: string; managerSoir?: string; commentMidi?: string; commentSoir?: string; googleRatings?: Record<number, string> }) => string;
  handleValidateDailyRecapMail: () => void;
};

export default function DashboardDailyRecapModal({
  isMobile,
  setIsDailyRecapModalOpen,
  recapPreviewRef,
  dailyRecapManagers,
  setDailyRecapManagers,
  dailyRecapServiceComments,
  setDailyRecapServiceComments,
  dailyRecapGoogleRatings,
  setDailyRecapGoogleRatings,
  buildDailyRecapHtml,
  handleValidateDailyRecapMail,
}: DashboardDailyRecapModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 105, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 18 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 'min(980px, 100%)', maxWidth: 'calc(100vw - 36px)', maxHeight: 'calc(100vh - 36px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.16), 0 10px 10px -5px rgba(0, 0, 0, 0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clipboard size={20} color="#0f766e" /> PrÃ©parer le mail de clÃ´ture
          </h3>
          <button onClick={() => setIsDailyRecapModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: isMobile ? 14 : 20, overflow: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, .75fr) minmax(420px, 1.25fr)', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 12, border: '1px solid #dbeafe', borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', fontSize: 12, lineHeight: 1.45, fontWeight: 750 }}>
              VÃ©rifie le contenu avant ouverture du mail. Le texte sera aussi copiÃ© dans le presse-papiers.
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Responsable midi</span>
              <input
                value={dailyRecapManagers.midi}
                onChange={event => setDailyRecapManagers(prev => ({ ...prev, midi: event.target.value }))}
                style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                placeholder="Nom du responsable"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Commentaire midi</span>
              <textarea
                value={dailyRecapServiceComments.midi}
                onChange={event => setDailyRecapServiceComments(prev => ({ ...prev, midi: event.target.value }))}
                style={{ minHeight: 70, resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}
                placeholder="Commentaire spÃ©cifique au service midi..."
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Responsable soir</span>
              <input
                value={dailyRecapManagers.soir}
                onChange={event => setDailyRecapManagers(prev => ({ ...prev, soir: event.target.value }))}
                style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                placeholder="Nom du responsable"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Commentaire soir</span>
              <textarea
                value={dailyRecapServiceComments.soir}
                onChange={event => setDailyRecapServiceComments(prev => ({ ...prev, soir: event.target.value }))}
                style={{ minHeight: 70, resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}
                placeholder="Commentaire spÃ©cifique au service soir..."
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Notes Google du jour</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(stars => (
                  <label key={stars} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>{stars}*</span>
                    <input
                      type="number"
                      min="0"
                      value={dailyRecapGoogleRatings[stars] || ''}
                      onChange={event => setDailyRecapGoogleRatings(prev => ({ ...prev, [stars]: event.target.value.replace(/[^0-9]/g, '') }))}
                      style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 6px', fontWeight: 850, color: '#0f172a', textAlign: 'center' }}
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>AperÃ§u du mail</div>
            <div
              ref={recapPreviewRef}
              style={{ margin: 0, minHeight: 360, maxHeight: '55vh', overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc', padding: 16, color: '#0f172a', fontSize: 14, lineHeight: 1.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}
              dangerouslySetInnerHTML={{
                __html: buildDailyRecapHtml({
                  managerMidi: dailyRecapManagers.midi,
                  managerSoir: dailyRecapManagers.soir,
                  commentMidi: dailyRecapServiceComments.midi,
                  commentSoir: dailyRecapServiceComments.soir,
                  googleRatings: dailyRecapGoogleRatings,
                }),
              }}
            />
          </div>
        </div>
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => setIsDailyRecapModalOpen(false)} style={{ height: 38, padding: '0 14px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer' }}>
            Annuler
          </button>
          <button type="button" onClick={handleValidateDailyRecapMail} style={{ height: 38, padding: '0 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
            Valider et ouvrir le mail
          </button>
        </div>
      </div>
    </div>
  );
}
