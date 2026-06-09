import React from 'react';

import type { DashboardRow } from '@/features/dashboard/dashboardTypes';
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

type DebouncedInputComponent = React.ComponentType<{
  value: string | number;
  onChange: (value: string | number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  dataRow: string | number;
  dataCol: string | number;
}>;

type CashDetailId = 'ancv' | 'tr';

type DashboardCaisseViewProps = {
  selectedDayRow?: DashboardRow;
  selectedDayRowIndex: number;
  globalData: Record<number, any>;
  month: number;
  isMobile: boolean;
  expandedCashDetail: CashDetailId | null;
  setExpandedCashDetail: (value: CashDetailId | null) => void;
  setCashValidationDraft: (value: string) => void;
  setIsCashValidationModalOpen: (value: boolean) => void;
  cashInputClass: string;
  DebouncedInput: DebouncedInputComponent;
  parseCaisseNumber: (value: string) => number;
  renderCashAutoValue: (value: string | number, options?: { style?: React.CSSProperties }) => React.ReactNode;
  updateNepting: (month: number, day: number, field: keyof DayDataNepting, value: string) => void;
  updateEspeces: (month: number, day: number, field: keyof DayDataEspeces, value: string) => void;
  updateAmexAncv: (month: number, day: number, field: keyof DayDataAmexAncv, value: string) => void;
  updateConecs: (month: number, day: number, field: keyof DayDataConecs, value: string) => void;
  updateAncvPapiers: (month: number, day: number, field: keyof DayDataAncvPapiers, value: string) => void;
  updateSaisieTR: (month: number, day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => void;
  updateSunday: (month: number, day: number, field: keyof DayDataSunday, value: string) => void;
  updateUber: (month: number, day: number, field: keyof DayDataUber, value: string) => void;
  updateDeliveroo: (month: number, day: number, field: keyof DayDataDeliveroo, value: string) => void;
  updateClickCollect: (month: number, day: number, field: keyof DayDataClickCollect, value: string) => void;
};

export default function DashboardCaisseView({
  selectedDayRow,
  selectedDayRowIndex,
  globalData,
  month,
  isMobile,
  expandedCashDetail,
  setExpandedCashDetail,
  setCashValidationDraft,
  setIsCashValidationModalOpen,
  cashInputClass,
  DebouncedInput,
  parseCaisseNumber,
  renderCashAutoValue,
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
}: DashboardCaisseViewProps) {
  const day = selectedDayRow?.dayIndex;
  if (!day) return null;

  const monthData = globalData[month];
  // reel est stocké en number ; on convertit en string pour les inputs qui attendent une string
  const reelStr = (v: string | number | undefined): string => (v != null && v !== 0 && v !== '' ? String(v) : '');
  const nepting = monthData?.nepting?.[day];
  const especes = monthData?.especes?.[day];
  const conecs = monthData?.conecs?.[day];
  const ancv = monthData?.ancvPapiers?.[day];
  const sunday = monthData?.sunday?.[day];
  const uber = monthData?.uber?.[day];
  const amexAncv = monthData?.amexAncv?.[day];
  const deliveroo = monthData?.deliveroo?.[day];
  const clickCollect = monthData?.clickCollect?.[day];
  const trData = monthData?.saisieTR?.[day];
  const trPapier = trData?.edenred?.[0];
  const trPapierProviders = [
    { key: 'bimpli', label: 'Bimpli' },
    { key: 'up', label: 'Up' },
    { key: 'pluxee', label: 'Pluxee' },
    { key: 'edenred', label: 'Edenred' },
  ] as const;
  const trPapierReel = trPapierProviders.reduce((sum, provider) => sum + parseCaisseNumber(trData?.[provider.key]?.[0]?.valeur || ''), 0);
  const trPapierDisplay = trPapierReel ? trPapierReel.toFixed(2) : trPapier?.valeur || '';
  const theorique = monthData?.theorique?.[day];
  const cashValidationComment = nepting?.commentaire || '';
  const cashValidationLabel = cashValidationComment ? 'Validation enregistrée' : 'Non validé';

  const renderCashDetailField = (label: string, value: string, onChange: (value: string) => void) => (
    <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      <DebouncedInput
        dataRow={`cash-detail-${selectedDayRowIndex}`}
        dataCol={label}
        value={value}
        onChange={nextValue => onChange(String(nextValue).replace(/[^0-9]/g, ''))}
        className="w-full h-7 rounded-md border border-slate-400 bg-white px-2 text-right text-xs font-bold text-slate-950 outline-none transition-all focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15"
        placeholder=""
      />
    </label>
  );

  const renderRealCaisseControl = (
    label: string,
    theoriqueValue: string,
    value: string,
    onChange: (value: string) => void,
    options: { detailId?: CashDetailId; details?: React.ReactNode; invertEcart?: boolean } = {}
  ) => {
    const hasValues = Boolean(theoriqueValue || value);
    const realValue = parseCaisseNumber(value) * (options.invertEcart ? -1 : 1);
    const ecart = realValue - parseCaisseNumber(theoriqueValue);
    const ecartDisplay = hasValues ? ecart.toFixed(2) : '-';
    const isExpanded = options.detailId && expandedCashDetail === options.detailId;

    return (
      <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', minWidth: 0 }}>
        {options.detailId ? (
          <button
            type="button"
            onClick={() => setExpandedCashDetail(isExpanded ? null : options.detailId || null)}
            style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: 'none', background: 'transparent', padding: 0, color: isExpanded ? '#0f766e' : '#334155', cursor: 'pointer', fontSize: 10, fontWeight: 950, letterSpacing: '.03em', textAlign: 'left', textTransform: 'uppercase', textDecoration: isExpanded ? 'underline' : 'none', textUnderlineOffset: 3 }}
            title="Afficher le détail du nombre"
          >
            {label}
          </button>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        )}
        {renderCashAutoValue(theoriqueValue)}
        <DebouncedInput
          dataRow={`cash-${selectedDayRowIndex}`}
          dataCol={label}
          value={value}
          onChange={nextValue => onChange(String(nextValue).replace(/[^0-9.,-]/g, '').replace(',', '.'))}
          className={cashInputClass}
          placeholder=""
        />
        {renderCashAutoValue(ecartDisplay, { style: { color: hasValues && ecart < -0.001 ? '#dc2626' : hasValues && ecart > 0.001 ? '#059669' : '#475569' } })}
        {isExpanded && options.details ? (
          <div style={{ gridColumn: '2 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 6, padding: 6, border: '1px solid #0f172a', borderRadius: 8, background: '#f8fafc' }}>
            {options.details}
          </div>
        ) : null}
      </div>
    );
  };

  const cashRows = [
    { label: 'CB', theorique: theorique?.cb || '', value: reelStr(nepting?.saisie_reel_nepting) },
    { label: 'Pourboires', theorique: '', value: reelStr(nepting?.pourboire_sunday), multiplier: -1 },
    { label: 'Espèces coffre', theorique: theorique?.especes || '', value: reelStr(especes?.mis_au_coffre) },
    { label: 'Pièces', theorique: '', value: reelStr(especes?.pieces) },
    { label: 'AMEX/ANCV carte', theorique: theorique?.amex || '', value: reelStr(amexAncv?.reel_nepting) },
    { label: 'TR carte', theorique: theorique?.tr_carte || '', value: reelStr(conecs?.conecs_reel_nepting) },
    { label: 'ANCV papier', theorique: theorique?.ancv || '', value: ancv?.montant_total || '' },
    { label: 'TR papier', theorique: theorique?.tr_papier || '', value: trPapierDisplay },
    { label: 'Sunday', theorique: theorique?.sunday || '', value: reelStr(sunday?.reel) },
    { label: 'Uber', theorique: theorique?.uber || '', value: reelStr(uber?.reel) },
    { label: 'Deliveroo', theorique: theorique?.deliveroo || '', value: reelStr(deliveroo?.reel) },
    { label: 'Click & collect', theorique: theorique?.click_collect || '', value: reelStr(clickCollect?.reel) },
  ];
  const totalTheorique = cashRows.reduce((sum, row) => sum + parseCaisseNumber(row.theorique), 0);
  const totalReel = cashRows.reduce((sum, row) => sum + parseCaisseNumber(row.value) * (row.multiplier || 1), 0);
  const totalEcart = totalReel - totalTheorique;
  const hasTotalEcart = Math.abs(totalEcart) > 0.001;
  const totalEcartColor = totalEcart < -0.001 ? '#dc2626' : totalEcart > 0.001 ? '#059669' : '#475569';

  const handleCashValidation = () => {
    if (hasTotalEcart) {
      setCashValidationDraft(cashValidationComment.replace(/^Validation caisse\s*:\s*/i, ''));
      setIsCashValidationModalOpen(true);
      return;
    }
    updateNepting(month, day, 'commentaire', `Validation caisse : OK sans écart le ${new Date().toLocaleDateString('fr-FR')}`);
  };

  return (
    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr', gap: 5, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <div />
        <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Théorique</div>
        <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Réel</div>
        <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Écart</div>
      </div>
      {renderRealCaisseControl('CB', theorique?.cb || '', reelStr(nepting?.saisie_reel_nepting), value => updateNepting(month, day, 'saisie_reel_nepting', value))}
      {renderRealCaisseControl('Pourboires', '', reelStr(nepting?.pourboire_sunday), value => updateNepting(month, day, 'pourboire_sunday', value), { invertEcart: true })}
      {renderRealCaisseControl('Espèces coffre', theorique?.especes || '', reelStr(especes?.mis_au_coffre), value => updateEspeces(month, day, 'mis_au_coffre', value))}
      {renderRealCaisseControl('Pièces', '', reelStr(especes?.pieces), value => updateEspeces(month, day, 'pieces', value))}
      {renderRealCaisseControl('AMEX/ANCV carte', theorique?.amex || '', reelStr(amexAncv?.reel_nepting), value => updateAmexAncv(month, day, 'reel_nepting', value))}
      {renderRealCaisseControl('TR carte', theorique?.tr_carte || '', reelStr(conecs?.conecs_reel_nepting), value => updateConecs(month, day, 'conecs_reel_nepting', value))}
      {renderRealCaisseControl('ANCV papier', theorique?.ancv || '', ancv?.montant_total || '', value => updateAncvPapiers(month, day, 'montant_total', value), {
        detailId: 'ancv',
        details: renderCashDetailField('Nombre ANCV papier', ancv?.nombre_ancv || '', value => updateAncvPapiers(month, day, 'nombre_ancv', value)),
      })}
      {renderRealCaisseControl('TR papier', theorique?.tr_papier || '', trPapierDisplay, value => {
        updateSaisieTR(month, day, 'edenred', 0, 'valeur', value);
      }, {
        detailId: 'tr',
        details: trPapierProviders.map(provider => renderCashDetailField(provider.label, trData?.[provider.key]?.[0]?.nombre || '', value => updateSaisieTR(month, day, provider.key, 0, 'nombre', value))),
      })}
      {renderRealCaisseControl('Sunday', theorique?.sunday || '', reelStr(sunday?.reel), value => updateSunday(month, day, 'reel', value))}
      {renderRealCaisseControl('Uber', theorique?.uber || '', reelStr(uber?.reel), value => updateUber(month, day, 'reel', value))}
      {renderRealCaisseControl('Deliveroo', theorique?.deliveroo || '', reelStr(deliveroo?.reel), value => updateDeliveroo(month, day, 'reel', value))}
      {renderRealCaisseControl('Click & collect', theorique?.click_collect || '', reelStr(clickCollect?.reel), value => updateClickCollect(month, day, 'reel', value))}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', marginTop: 2, paddingTop: 7, borderTop: '1px solid #cbd5e1' }}>
        <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Total caisse</div>
        {renderCashAutoValue(totalTheorique.toFixed(2))}
        {renderCashAutoValue(totalReel.toFixed(2))}
        {renderCashAutoValue(totalEcart.toFixed(2), { style: { color: totalEcartColor } })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '7px 10px', border: `1px solid ${hasTotalEcart ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, background: hasTotalEcart ? '#fef2f2' : '#f0fdf4' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: hasTotalEcart ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '.04em' }}>Écart total : {totalEcart.toFixed(2)}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cashValidationLabel}</div>
        </div>
        <button
          type="button"
          onClick={handleCashValidation}
          style={{ border: 'none', borderRadius: 7, background: hasTotalEcart ? '#dc2626' : '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 950, padding: '7px 11px', whiteSpace: 'nowrap' }}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
