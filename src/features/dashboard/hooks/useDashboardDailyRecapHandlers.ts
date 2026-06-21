import domtoimage from 'dom-to-image-more';

import type { DashboardColumn } from '@/features/dashboard/dashboardTypes';
import {
  formatPayrollHourVisualValue,
  formatValue,
  isPayrollInputColumn,
  parseDashboardNumber,
} from '@/features/dashboard/dashboardCalculations';

type DailyRecapOptions = {
  managerMidi?: string;
  managerSoir?: string;
  commentMidi?: string;
  commentSoir?: string;
  googleRatings?: Record<number, string>;
};

export function useDashboardDailyRecapHandlers(params: {
  selectedDayRowIndex: number;
  selectedDayLabel: string;
  calculatedData: Record<string, string>;
  dynamicColumns: DashboardColumn[];
  dailyRecapManagers: { midi: string; soir: string };
  dailyRecapServiceComments: { midi: string; soir: string };
  dailyRecapGoogleRatings: Record<number, string>;
  setDailyRecapStatus: (s: string) => void;
  setIsDailyRecapModalOpen: (open: boolean) => void;
}) {
  const {
    selectedDayRowIndex,
    selectedDayLabel,
    calculatedData,
    dynamicColumns,
    dailyRecapManagers,
    dailyRecapServiceComments,
    dailyRecapGoogleRatings,
    setDailyRecapStatus,
    setIsDailyRecapModalOpen,
  } = params;

  const getDailyCellValue = (col: number) => selectedDayRowIndex >= 0 ? calculatedData[`${selectedDayRowIndex}-${col}`] || '' : '';
  const getDailyDisplayValue = (col: number) => {
    const value = getDailyCellValue(col);
    return isPayrollInputColumn(col) ? formatPayrollHourVisualValue(value) : formatValue(value, dynamicColumns[col] || ['', '', '', ''], col);
  };

  const formatDailyRecapNumber = (value: number, decimals = 2) => new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  const formatDailyRecapCurrency = (value: number, suffix = ' HT') => `${formatDailyRecapNumber(value)} €${suffix}`;
  const formatDailyRecapTicket = (value: number) => `${formatDailyRecapNumber(value)} €`;
  const formatDailyRecapInteger = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
  const formatDailyRecapDelta = (value: number, decimals = 2) => `${value > 0 ? '+' : ''}${formatDailyRecapNumber(value, decimals)}`;
  const formatDailyRecapPercent = (delta: number, budget: number) => (
    budget > 0 ? ` (${formatDailyRecapDelta((delta / budget) * 100, 1)}%)` : ''
  );
  const dailyRecapDeltaClass = (value: number) => value < 0 ? 'negative' : value > 0 ? 'positive' : 'neutral';
  const dailyRecapDeltaColor = (value: number) => value < 0 ? '#dc2626' : value > 0 ? '#15803d' : '#334155';
  const dailyRecapDeltaHtml = (value: number, suffix = ' €') => `<strong style="color:${dailyRecapDeltaColor(value)}">${formatDailyRecapDelta(value)}${suffix}</strong>`;
  const escapeDailyRecapHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const dailyRecapTextLine = (label: string, value: string) => `  ${label.padEnd(18, ' ')} : ${value}`;
  const dailyRecapMetricHtml = (label: string, value: string) => (
    `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start;margin:3px 0"><span style="color:#475569">${label}</span><strong style="color:#0f172a">${value}</strong></div>`
  );
  const dailyRecapBudgetHtml = (label: string, value: number, suffix = ' €', percent = '') => (
    `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start;margin:3px 0"><span style="color:#475569">${label}</span><span>${dailyRecapDeltaHtml(value, suffix)}${percent}</span></div>`
  );

  const getDailyRecapService = (label: string, caCol: number, coversCol: number, tmCol: number, budgetCaCol: number, budgetCoversCol: number, budgetTmCol: number) => {
    const ca = parseDashboardNumber(getDailyCellValue(caCol));
    const covers = parseDashboardNumber(getDailyCellValue(coversCol));
    const tm = parseDashboardNumber(getDailyCellValue(tmCol));
    const budgetCa = parseDashboardNumber(getDailyCellValue(budgetCaCol));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(budgetCoversCol));
    const budgetTm = parseDashboardNumber(getDailyCellValue(budgetTmCol));
    return { label, ca, covers, tm, budgetCa, budgetCovers, budgetTm };
  };

  const buildDailyRecapServiceText = (
    service: ReturnType<typeof getDailyRecapService>,
    manager: string,
    comment: string,
  ) => {
    const budgetLines = [
      service.budgetCa > 0 ? dailyRecapTextLine('CA', `${formatDailyRecapDelta(service.ca - service.budgetCa)} €${formatDailyRecapPercent(service.ca - service.budgetCa, service.budgetCa)}`) : '',
      service.budgetCovers > 0 && service.covers > 0 ? dailyRecapTextLine('Couverts', `${formatDailyRecapDelta(service.covers - service.budgetCovers, 0)}${formatDailyRecapPercent(service.covers - service.budgetCovers, service.budgetCovers)}`) : '',
      service.budgetTm > 0 && service.tm > 0 ? dailyRecapTextLine('Ticket moyen', `${formatDailyRecapDelta(service.tm - service.budgetTm)} €${formatDailyRecapPercent(service.tm - service.budgetTm, service.budgetTm)}`) : '',
    ].filter(Boolean);
    const lines = [
      `----- ${service.label.toUpperCase()} -----`,
      manager.trim() ? `Responsable : ${manager.trim()}` : '',
    ];
    if (service.ca > 0 || service.covers > 0 || service.tm > 0) {
      lines.push(
        '',
        'Réalisé',
        dailyRecapTextLine('CA HT', formatDailyRecapCurrency(service.ca)),
        ...(service.covers > 0 ? [dailyRecapTextLine('Couverts', formatDailyRecapInteger(service.covers))] : []),
        ...(service.tm > 0 ? [dailyRecapTextLine('Ticket moyen', formatDailyRecapTicket(service.tm))] : []),
      );
    }
    if (budgetLines.length > 0) lines.push('', 'Écart vs budget', ...budgetLines);
    if (comment.trim()) lines.push('', `Commentaire : ${comment.trim()}`);
    return lines.filter(line => line !== null && line !== undefined);
  };

  const buildDailyRecapServiceHtml = (
    service: ReturnType<typeof getDailyRecapService>,
    manager: string,
    comment: string,
  ) => {
    const realisedRows = [
      service.ca > 0 ? dailyRecapMetricHtml('CA HT', formatDailyRecapCurrency(service.ca)) : '',
      service.covers > 0 ? dailyRecapMetricHtml('Couverts', formatDailyRecapInteger(service.covers)) : '',
      service.tm > 0 ? dailyRecapMetricHtml('Ticket moyen', formatDailyRecapTicket(service.tm)) : '',
    ].filter(Boolean).join('');
    const budgetRows = [
      service.budgetCa > 0 ? dailyRecapBudgetHtml('CA', service.ca - service.budgetCa, ' €', formatDailyRecapPercent(service.ca - service.budgetCa, service.budgetCa)) : '',
      service.budgetCovers > 0 && service.covers > 0 ? dailyRecapBudgetHtml('Couverts', service.covers - service.budgetCovers, '', formatDailyRecapPercent(service.covers - service.budgetCovers, service.budgetCovers)) : '',
      service.budgetTm > 0 && service.tm > 0 ? dailyRecapBudgetHtml('Ticket moyen', service.tm - service.budgetTm, ' €', formatDailyRecapPercent(service.tm - service.budgetTm, service.budgetTm)) : '',
    ].filter(Boolean).join('');
    if (service.ca > 0 || service.covers > 0 || service.tm > 0) {
      return `<section style="margin:18px 0;padding:14px 16px;border:1px solid #dbe3ef;border-left:5px solid #0f766e;border-radius:10px;background:#ffffff">
        <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;text-transform:uppercase">${service.label}</h3>
        ${manager.trim() ? `<p style="margin:0 0 12px;color:#334155"><strong>Responsable :</strong> ${escapeDailyRecapHtml(manager.trim())}</p>` : ''}
        <p style="margin:0 0 4px;font-weight:700;color:#0f766e">Réalisé</p>
        <div style="margin:0 0 10px 0">${realisedRows}</div>
        ${budgetRows ? `<p style="margin:10px 0 4px;font-weight:700;color:#64748b">Écart vs budget</p><div style="margin:0 0 10px 0">${budgetRows}</div>` : ''}
        ${comment.trim() ? `<p style="margin:10px 0 0;padding:8px 10px;background:#f8fafc;border-radius:8px;color:#334155"><strong>Commentaire :</strong> ${escapeDailyRecapHtml(comment.trim())}</p>` : ''}
      </section>`;
    }
    return '';
  };

  const buildDailyRecapReport = (options: DailyRecapOptions = {}) => {
    const totalCa = parseDashboardNumber(getDailyCellValue(21));
    const budgetCa = parseDashboardNumber(getDailyCellValue(3));
    const totalCovers = parseDashboardNumber(getDailyCellValue(29));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(10));
    const ticketMoyen = parseDashboardNumber(getDailyCellValue(30));
    const budgetTicketMoyen = parseDashboardNumber(getDailyCellValue(11));
    const vae = parseDashboardNumber(getDailyCellValue(17));
    const limonade = parseDashboardNumber(getDailyCellValue(20));
    const limonadeCovers = parseDashboardNumber(getDailyCellValue(34));
    const limonadeTm = parseDashboardNumber(getDailyCellValue(35));
    const eventRestaurant = String(getDailyCellValue(37) || '').trim();
    const eventNational = String(getDailyCellValue(38) || '').trim();
    const midi = getDailyRecapService('Midi', 18, 25, 26, 0, 6, 7);
    const soir = getDailyRecapService('Soir', 19, 27, 28, 1, 8, 9);
    const googleRatings = [5, 4, 3, 2, 1]
      .map(stars => ({ stars, value: Number(String(options.googleRatings?.[stars] || '').replace(',', '.')) || 0 }))
      .filter(item => item.value > 0);

    const jourBudgetLines = [
      budgetCa > 0 ? dailyRecapTextLine('CA', `${formatDailyRecapDelta(totalCa - budgetCa)} €${formatDailyRecapPercent(totalCa - budgetCa, budgetCa)}`) : '',
      budgetCovers > 0 ? dailyRecapTextLine('Couverts', `${formatDailyRecapDelta(totalCovers - budgetCovers, 0)}${formatDailyRecapPercent(totalCovers - budgetCovers, budgetCovers)}`) : '',
      budgetTicketMoyen > 0 ? dailyRecapTextLine('Ticket moyen', `${formatDailyRecapDelta(ticketMoyen - budgetTicketMoyen)} €${formatDailyRecapPercent(ticketMoyen - budgetTicketMoyen, budgetTicketMoyen)}`) : '',
    ].filter(Boolean);
    const jourText = [
      '----- JOURNÉE -----',
      'Synthèse',
      dailyRecapTextLine('CA HT', formatDailyRecapCurrency(totalCa)),
      dailyRecapTextLine('Couverts', formatDailyRecapInteger(totalCovers)),
      dailyRecapTextLine('Ticket moyen', formatDailyRecapTicket(ticketMoyen)),
      vae > 0 ? dailyRecapTextLine('VAE', formatDailyRecapCurrency(vae)) : '',
      limonade > 0 ? dailyRecapTextLine('Limonade', `${formatDailyRecapCurrency(limonade)}${limonadeCovers > 0 ? ` | ${formatDailyRecapInteger(limonadeCovers)} couverts` : ''}${limonadeTm > 0 ? ` | TM ${formatDailyRecapTicket(limonadeTm)}` : ''}`) : '',
      ...(jourBudgetLines.length > 0 ? ['', 'Écart vs budget', ...jourBudgetLines] : []),
    ].filter(Boolean);

    const textSections = [
      'Bonsoir,',
      '',
      `Voici le récap de clôture du ${selectedDayLabel}.`,
      '',
      ...buildDailyRecapServiceText(midi, options.managerMidi || '', options.commentMidi || ''),
      '',
      ...buildDailyRecapServiceText(soir, options.managerSoir || '', options.commentSoir || ''),
      '',
      ...jourText,
      ...(eventRestaurant || eventNational ? ['', '----- ÉVÉNEMENTS -----', ...(eventRestaurant ? [dailyRecapTextLine('Restaurant', eventRestaurant)] : []), ...(eventNational ? [dailyRecapTextLine('National', eventNational)] : [])] : []),
      ...(googleRatings.length > 0 ? ['', '----- NOTES GOOGLE -----', ...googleRatings.map(item => dailyRecapTextLine(`${item.stars} étoile${item.stars > 1 ? 's' : ''}`, formatDailyRecapInteger(item.value)))] : []),
      '',
      'Bonne soirée,',
      '',
      'Cordialement,',
    ];

    const jourHtmlRows = [
      dailyRecapMetricHtml('CA HT', formatDailyRecapCurrency(totalCa)),
      dailyRecapMetricHtml('Couverts', formatDailyRecapInteger(totalCovers)),
      dailyRecapMetricHtml('Ticket moyen', formatDailyRecapTicket(ticketMoyen)),
      vae > 0 ? dailyRecapMetricHtml('VAE', formatDailyRecapCurrency(vae)) : '',
      limonade > 0 ? dailyRecapMetricHtml('Limonade', `${formatDailyRecapCurrency(limonade)}${limonadeCovers > 0 ? ` | ${formatDailyRecapInteger(limonadeCovers)} couverts` : ''}${limonadeTm > 0 ? ` | TM ${formatDailyRecapTicket(limonadeTm)}` : ''}`) : '',
    ].filter(Boolean).join('');
    const jourBudgetHtmlRows = [
      budgetCa > 0 ? dailyRecapBudgetHtml('CA', totalCa - budgetCa, ' €', formatDailyRecapPercent(totalCa - budgetCa, budgetCa)) : '',
      budgetCovers > 0 ? dailyRecapBudgetHtml('Couverts', totalCovers - budgetCovers, '', formatDailyRecapPercent(totalCovers - budgetCovers, budgetCovers)) : '',
      budgetTicketMoyen > 0 ? dailyRecapBudgetHtml('Ticket moyen', ticketMoyen - budgetTicketMoyen, ' €', formatDailyRecapPercent(ticketMoyen - budgetTicketMoyen, budgetTicketMoyen)) : '',
    ].filter(Boolean).join('');
    const optionalHtml = [
      eventRestaurant || eventNational ? `<section style="margin:18px 0;padding:14px 16px;border:1px solid #fde68a;border-left:5px solid #f59e0b;border-radius:10px;background:#fffbeb"><h3 style="margin:0 0 10px;font-size:16px;color:#92400e;text-transform:uppercase">Événements</h3>${eventRestaurant ? `<p style="margin:2px 0"><strong>Restaurant :</strong> ${escapeDailyRecapHtml(eventRestaurant)}</p>` : ''}${eventNational ? `<p style="margin:2px 0"><strong>National :</strong> ${escapeDailyRecapHtml(eventNational)}</p>` : ''}</section>` : '',
      googleRatings.length > 0 ? `<section style="margin:18px 0;padding:14px 16px;border:1px solid #dbe3ef;border-left:5px solid #64748b;border-radius:10px;background:#ffffff"><h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;text-transform:uppercase">Notes Google</h3><div>${googleRatings.map(item => dailyRecapMetricHtml(`${item.stars} étoile${item.stars > 1 ? 's' : ''}`, formatDailyRecapInteger(item.value))).join('')}</div></section>` : '',
    ].filter(Boolean).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;max-width:720px">
      <p style="margin:0 0 12px">Bonsoir,</p>
      <div style="margin:0 0 18px;padding:14px 16px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc">
        <p style="margin:0;color:#0f766e;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.04em">Récapitulatif de clôture</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0f172a">${escapeDailyRecapHtml(selectedDayLabel)}</p>
      </div>
      ${buildDailyRecapServiceHtml(midi, options.managerMidi || '', options.commentMidi || '')}
      ${buildDailyRecapServiceHtml(soir, options.managerSoir || '', options.commentSoir || '')}
      <section style="margin:18px 0;padding:14px 16px;border:1px solid #bfdbfe;border-left:5px solid #2563eb;border-radius:10px;background:#eff6ff">
        <h3 style="margin:0 0 10px;font-size:16px;color:#1e3a8a;text-transform:uppercase">Journée</h3>
        <p style="margin:0 0 4px;font-weight:700;color:#1d4ed8">Synthèse</p>
        <div style="margin:0 0 10px 0">${jourHtmlRows}</div>
        ${jourBudgetHtmlRows ? `<p style="margin:10px 0 4px;font-weight:700;color:#64748b">Écart vs budget</p><div style="margin:0 0 10px 0">${jourBudgetHtmlRows}</div>` : ''}
      </section>
      ${optionalHtml}
      <p style="margin:18px 0 0">Bonne soirée,</p>
      <p style="margin:12px 0 0">Cordialement,</p>
    </div>`;

    return { text: textSections.filter(line => line !== null && line !== undefined).join('\n'), html };
  };

  const buildDailyRecapText = (options: DailyRecapOptions = {}) => buildDailyRecapReport(options).text;
  const buildDailyRecapHtml = (options: DailyRecapOptions = {}) => buildDailyRecapReport(options).html;
  const buildOutlookComposeUrl = (subject: string, textBody?: string) => {
    const baseUrl = 'https://outlook.office.com/mail/deeplink/compose';
    const subjectParam = `subject=${encodeURIComponent(subject)}`;
    if (!textBody) return `${baseUrl}?${subjectParam}`;

    const url = `${baseUrl}?${subjectParam}&body=${encodeURIComponent(textBody)}`;
    if (url.length < 8000) return url;

    return `${baseUrl}?${subjectParam}`;
  };
  const copyDailyRecapImageToClipboard = async (
    recapHtml: string,
    ClipboardItemCtor: typeof ClipboardItem,
  ) => {
    const captureHost = document.createElement('div');
    captureHost.style.position = 'fixed';
    captureHost.style.left = '-10000px';
    captureHost.style.top = '0';
    captureHost.style.width = '780px';
    captureHost.style.padding = '24px';
    captureHost.style.background = '#ffffff';
    captureHost.style.zIndex = '-1';
    captureHost.innerHTML = recapHtml;
    document.body.appendChild(captureHost);

    try {
      await document.fonts?.ready;
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      const target = (captureHost.firstElementChild as HTMLElement | null) || captureHost;
      target.style.width = '720px';
      target.style.maxWidth = '720px';
      target.style.background = '#ffffff';

      const blob = await domtoimage.toBlob(target, {
        bgcolor: '#ffffff',
        quality: 1,
        width: target.scrollWidth,
        height: target.scrollHeight,
        style: {
          width: '720px',
          maxWidth: '720px',
          overflow: 'visible',
        },
      });

      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
    } finally {
      document.body.removeChild(captureHost);
    }
  };
  const copyDailyRecapCanvasImageToClipboard = async (
    options: DailyRecapOptions,
    ClipboardItemCtor: typeof ClipboardItem,
  ) => {
    const totalCa = parseDashboardNumber(getDailyCellValue(21));
    const budgetCa = parseDashboardNumber(getDailyCellValue(3));
    const totalCovers = parseDashboardNumber(getDailyCellValue(29));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(10));
    const ticketMoyen = parseDashboardNumber(getDailyCellValue(30));
    const budgetTicketMoyen = parseDashboardNumber(getDailyCellValue(11));
    const vae = parseDashboardNumber(getDailyCellValue(17));
    const limonade = parseDashboardNumber(getDailyCellValue(20));
    const midi = getDailyRecapService('Midi', 18, 25, 26, 0, 6, 7);
    const soir = getDailyRecapService('Soir', 19, 27, 28, 1, 8, 9);
    const googleRatings = [5, 4, 3, 2, 1]
      .map(stars => ({ stars, value: Number(String(options.googleRatings?.[stars] || '').replace(',', '.')) || 0 }))
      .filter(item => item.value > 0);

    const width = 620;
    const pad = 22;
    const cardGap = 12;
    const lineH = 20;
    type CanvasRecapRow = { label: string; value: string; color?: string; header?: boolean };
    const rows: CanvasRecapRow[] = [];
    const sections: Array<{ title: string; accent: string; rows: CanvasRecapRow[]; manager?: string; comment?: string }> = [];
    const deltaColor = (value: number) => value < 0 ? '#dc2626' : value > 0 ? '#15803d' : '#334155';
    const deltaText = (value: number, suffix = '', budget = 0, decimals = 2) => `${formatDailyRecapDelta(value, decimals)}${suffix}${formatDailyRecapPercent(value, budget)}`;
    const pushService = (service: ReturnType<typeof getDailyRecapService>, manager: string, comment: string, accent: string) => {
      const serviceRows = [
        { label: 'Réalisé', value: '', header: true },
        { label: 'CA HT', value: formatDailyRecapCurrency(service.ca) },
        ...(service.covers > 0 ? [{ label: 'Couverts', value: formatDailyRecapInteger(service.covers) }] : []),
        ...(service.tm > 0 ? [{ label: 'Ticket moyen', value: formatDailyRecapTicket(service.tm) }] : []),
        ...(service.budgetCa > 0 || (service.budgetCovers > 0 && service.covers > 0) || (service.budgetTm > 0 && service.tm > 0) ? [{ label: 'Écart vs budget', value: '', header: true }] : []),
        ...(service.budgetCa > 0 ? [{ label: 'CA', value: deltaText(service.ca - service.budgetCa, ' €', service.budgetCa), color: deltaColor(service.ca - service.budgetCa) }] : []),
        ...(service.budgetCovers > 0 && service.covers > 0 ? [{ label: 'Couverts', value: deltaText(service.covers - service.budgetCovers, '', service.budgetCovers, 0), color: deltaColor(service.covers - service.budgetCovers) }] : []),
        ...(service.budgetTm > 0 && service.tm > 0 ? [{ label: 'Ticket moyen', value: deltaText(service.tm - service.budgetTm, ' €', service.budgetTm), color: deltaColor(service.tm - service.budgetTm) }] : []),
      ];
      sections.push({ title: service.label, accent, rows: serviceRows, manager: manager.trim(), comment: comment.trim() });
    };
    pushService(midi, options.managerMidi || '', options.commentMidi || '', '#0f766e');
    pushService(soir, options.managerSoir || '', options.commentSoir || '', '#0f766e');
    rows.push(
      { label: 'Synthèse', value: '', header: true },
      { label: 'CA HT', value: formatDailyRecapCurrency(totalCa) },
      { label: 'Couverts', value: formatDailyRecapInteger(totalCovers) },
      { label: 'Ticket moyen', value: formatDailyRecapTicket(ticketMoyen) },
    );
    if (vae > 0) rows.push({ label: 'VAE', value: formatDailyRecapCurrency(vae) });
    if (limonade > 0) rows.push({ label: 'Limonade', value: formatDailyRecapCurrency(limonade) });
    if (budgetCa > 0 || budgetCovers > 0 || budgetTicketMoyen > 0) rows.push({ label: 'Écart vs budget', value: '', header: true });
    if (budgetCa > 0) rows.push({ label: 'CA', value: deltaText(totalCa - budgetCa, ' €', budgetCa), color: deltaColor(totalCa - budgetCa) });
    if (budgetCovers > 0) rows.push({ label: 'Couverts', value: deltaText(totalCovers - budgetCovers, '', budgetCovers, 0), color: deltaColor(totalCovers - budgetCovers) });
    if (budgetTicketMoyen > 0) rows.push({ label: 'Ticket moyen', value: deltaText(ticketMoyen - budgetTicketMoyen, ' €', budgetTicketMoyen), color: deltaColor(ticketMoyen - budgetTicketMoyen) });
    sections.push({ title: 'Journée', accent: '#2563eb', rows });
    if (googleRatings.length > 0) {
      sections.push({
        title: 'Notes Google',
        accent: '#64748b',
        rows: googleRatings.map(item => ({ label: `${item.stars} étoile${item.stars > 1 ? 's' : ''}`, value: formatDailyRecapInteger(item.value) })),
      });
    }

    const cardHeight = (section: typeof sections[number]) => (
      50 + section.rows.length * lineH + (section.manager ? 22 : 0) + (section.comment ? 30 : 0)
    );
    const contentHeight = 106 + sections.reduce((sum, section) => sum + cardHeight(section) + cardGap, 0) + 90;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = contentHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, contentHeight);

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    const drawText = (text: string, x: number, y: number, size = 13, weight = '400', color = '#111827') => {
      ctx.font = `${weight} ${size}px Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    drawText('Bonsoir,', pad, 30, 15, '400');
    ctx.fillStyle = '#ecfeff';
    roundRect(pad, 46, width - pad * 2, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#a5f3fc';
    ctx.stroke();
    drawText('Récapitulatif de clôture', pad + 14, 68, 12, '700', '#0f766e');
    drawText(selectedDayLabel, pad + 14, 88, 17, '700', '#0f172a');

    let y = 112;
    sections.forEach(section => {
      const h = cardHeight(section);
      ctx.fillStyle = section.title === 'Journée' ? '#eff6ff' : '#ffffff';
      roundRect(pad, y, width - pad * 2, h, 8);
      ctx.fill();
      ctx.strokeStyle = '#dbe3ef';
      ctx.stroke();
      ctx.fillStyle = section.accent;
      roundRect(pad, y, 5, h, 5);
      ctx.fill();
      drawText(section.title.toUpperCase(), pad + 16, y + 24, 15, '700', '#0f172a');
      let cy = y + 46;
      if (section.manager) {
        drawText(`Responsable : ${section.manager}`, pad + 16, cy, 13, '700', '#334155');
        cy += 22;
      }
      section.rows.forEach(row => {
        if (row.header) {
          drawText(row.label, pad + 16, cy, 13, '700', section.accent === '#2563eb' ? '#1d4ed8' : section.accent);
          cy += lineH;
          return;
        }
        drawText(row.label, pad + 16, cy, 13, '400', '#475569');
        drawText(row.value, pad + 185, cy, 13, '700', row.color || '#0f172a');
        cy += lineH;
      });
      if (section.comment) {
        drawText(`Commentaire : ${section.comment}`, pad + 16, cy + 8, 13, '700', '#334155');
      }
      y += h + cardGap;
    });
    drawText('Bonne soirée,', pad, y + 8, 15, '400');
    drawText('Cordialement,', pad, y + 32, 15, '400');

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(nextBlob => nextBlob ? resolve(nextBlob) : reject(new Error('Image non générée')), 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
  };

  const openDailyRecapPreview = () => {
    setDailyRecapStatus('');
    setIsDailyRecapModalOpen(true);
  };

  const handleValidateDailyRecapMail = async () => {
    const subject = `Chiffres du jour - ${selectedDayLabel}`;
    const recapOptions = {
      managerMidi: dailyRecapManagers.midi,
      managerSoir: dailyRecapManagers.soir,
      commentMidi: dailyRecapServiceComments.midi,
      commentSoir: dailyRecapServiceComments.soir,
      googleRatings: dailyRecapGoogleRatings,
    };
    const { text: recapText, html: recapHtml } = buildDailyRecapReport(recapOptions);
    const outlookUrl = buildOutlookComposeUrl(subject);
    const ClipboardItemCtor = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    const openOutlook = () => {
      const opened = window.open(outlookUrl, '_blank');
      if (!opened) window.location.href = outlookUrl;
    };

    if (typeof navigator.clipboard?.write === 'function' && ClipboardItemCtor) {
      try {
        await copyDailyRecapCanvasImageToClipboard(recapOptions, ClipboardItemCtor);
        openOutlook();
        setIsDailyRecapModalOpen(false);
        setDailyRecapStatus('Image copiée. Dans Outlook, clique dans le corps du mail puis Ctrl+V.');
        return;
      } catch {
        // Si la capture image echoue, on tente le fallback HTML juste apres.
      }
    }

    try {
      if (navigator.clipboard?.write && ClipboardItemCtor) {
        await navigator.clipboard.write([new ClipboardItemCtor({
          'text/html': new Blob([recapHtml], { type: 'text/html' }),
          'text/plain': new Blob([recapText], { type: 'text/plain' }),
        })]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recapText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = recapText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      openOutlook();
      setIsDailyRecapModalOpen(false);
      setDailyRecapStatus('Récap copié. Colle-le dans le corps du mail Outlook avec Ctrl+V.');
    } catch {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(recapText)}`;
      setIsDailyRecapModalOpen(false);
      setDailyRecapStatus("Mail ouvert en mode texte. Si la messagerie ne s'ouvre pas, le navigateur a bloqué le raccourci.");
    }
  };

  return {
    getDailyCellValue,
    getDailyDisplayValue,
    formatDailyRecapNumber,
    formatDailyRecapCurrency,
    formatDailyRecapTicket,
    formatDailyRecapInteger,
    formatDailyRecapDelta,
    formatDailyRecapPercent,
    getDailyRecapService,
    buildDailyRecapText,
    buildDailyRecapHtml,
    openDailyRecapPreview,
    handleValidateDailyRecapMail,
  };
}
