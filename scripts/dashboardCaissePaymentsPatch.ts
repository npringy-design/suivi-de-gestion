import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch paiements caisse non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardCaissePaymentsPatch = (): Plugin => ({
  name: 'dashboard-caisse-payments-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      `  const findCaisseAmounts = (text: string, label: string) => {
    const escaped = label.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(\`\${escaped}\\\\s+((?:-?\\\\d[\\\\d\\\\s]*,\\\\d{2}\\\\s*){1,3})\`, 'i'));
    return match ? extractCaisseNumbers(match[1]) : [];
  };
  const findCaisseAmount = (text: string, label: string) => {
    const amounts = findCaisseAmounts(text, label);
    return amounts[amounts.length - 1] || 0;
  };
  const findCaisseTheoriqueAmount = (text: string, label: string) => {
    const amounts = findCaisseAmounts(text, label);
    return amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0] || 0;
  };
  const extractCaisseNumbers = (text: string) => (text.match(/-?\\d[\\d\\s]*,\\d{2}/g) || []).map(parseCaisseNumber);`,
      `  const extractCaisseNumbers = (text: string) => (text.match(/-?\\d[\\d\\s]*,\\d{2}/g) || []).map(parseCaisseNumber);
  const findCaisseAmountRows = (text: string, label: string) => {
    const escaped = label.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(\`(?:^|[^A-ZÀ-ÿ0-9])\${escaped}\\\\s+((?:-?\\\\d[\\\\d\\\\s]*,\\\\d{2}\\\\s*){1,3})\`, 'gi');
    const rows: Array<{ amounts: number[]; amountStart: number }> = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amountText = match[1] || '';
      const amounts = extractCaisseNumbers(amountText);
      if (amounts.length === 0) continue;
      rows.push({ amounts, amountStart: match.index + match[0].lastIndexOf(amountText) });
    }
    return rows;
  };
  const sumCaisseRows = (rows: Array<{ amounts: number[]; amountStart: number }>, getter: (amounts: number[]) => number) => {
    const seen = new Set<number>();
    return rows.reduce((sum, row) => {
      if (seen.has(row.amountStart)) return sum;
      seen.add(row.amountStart);
      return sum + getter(row.amounts);
    }, 0);
  };
  const findCaisseAmounts = (text: string, label: string) => findCaisseAmountRows(text, label).flatMap(row => row.amounts);
  const findCaisseAmount = (text: string, label: string) => sumCaisseRows(
    findCaisseAmountRows(text, label),
    amounts => amounts[amounts.length - 1] || 0,
  );
  const findCaisseTheoriqueAmount = (text: string, label: string) => sumCaisseRows(
    findCaisseAmountRows(text, label),
    amounts => amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0] || 0,
  );
  const sumCaisseAmountLabels = (text: string, labels: string[]) => sumCaisseRows(
    labels.flatMap(label => findCaisseAmountRows(text, label)),
    amounts => amounts[amounts.length - 1] || 0,
  );
  const sumCaisseTheoriqueLabels = (text: string, labels: string[]) => sumCaisseRows(
    labels.flatMap(label => findCaisseAmountRows(text, label)),
    amounts => amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0] || 0,
  );`,
      'helpers extraction paiements'
    );

    next = replaceRequired(
      next,
      `    const sundayReel = findCaisseAmount(text, 'SUNDAY') + findCaisseAmount(text, 'CHEQUE BANCAIRE') + findCaisseAmount(text, 'SUNDAY MANUEL') + findCaisseAmount(text, 'SUNDAY TPE');
    const trPapierReel = findCaisseAmount(text, 'EDENRED TR PAPIER') + findCaisseAmount(text, 'BIMPLI TR PAPIER') + findCaisseAmount(text, 'PLUXEE TR PAPIER') + findCaisseAmount(text, 'UP TR PAPIER');
    const sundayTheorique = findCaisseTheoriqueAmount(text, 'SUNDAY') + findCaisseTheoriqueAmount(text, 'CHEQUE BANCAIRE') + findCaisseTheoriqueAmount(text, 'SUNDAY MANUEL') + findCaisseTheoriqueAmount(text, 'SUNDAY TPE');
    const trPapierTheorique = findCaisseTheoriqueAmount(text, 'EDENRED TR PAPIER') + findCaisseTheoriqueAmount(text, 'BIMPLI TR PAPIER') + findCaisseTheoriqueAmount(text, 'PLUXEE TR PAPIER') + findCaisseTheoriqueAmount(text, 'UP TR PAPIER');`,
      `    const cbCaisseLabels = ['CB', 'CARTE BLEUE', 'CARTE BANCAIRE', 'TPE SUNDAY', 'SUNDAY TPE'];
    const sundayCaisseLabels = ['SUNDAY', 'SUNDAY MANUEL', 'CHEQUE BANCAIRE'];
    const trPapierLabels = [
      'TR EDENRED', 'TR UP', 'TR BIMPLI', 'TR PLUXEE',
      'EDENRED TR', 'UP TR', 'BIMPLI TR', 'PLUXEE TR',
      'EDENRED TR PAPIER', 'UP TR PAPIER', 'BIMPLI TR PAPIER', 'PLUXEE TR PAPIER',
      'TR PAPIER EDENRED', 'TR PAPIER UP', 'TR PAPIER BIMPLI', 'TR PAPIER PLUXEE', 'TR PAPIER',
    ];
    const trCarteLabels = [
      'CARTE TR', 'TR CARTE',
      'CARTE EDENRED', 'CARTE UP', 'CARTE BIMPLI', 'CARTE PLUXEE',
      'EDENRED CARTE', 'UP CARTE', 'BIMPLI CARTE', 'PLUXEE CARTE',
      'EDENRED CARTE TR', 'UP CARTE TR', 'BIMPLI CARTE TR', 'PLUXEE CARTE TR',
      'TR CARTE EDENRED', 'TR CARTE UP', 'TR CARTE BIMPLI', 'TR CARTE PLUXEE',
    ];
    const cbReel = sumCaisseAmountLabels(text, cbCaisseLabels);
    const cbTheorique = sumCaisseTheoriqueLabels(text, cbCaisseLabels);
    const sundayReel = sumCaisseAmountLabels(text, sundayCaisseLabels);
    const sundayTheorique = sumCaisseTheoriqueLabels(text, sundayCaisseLabels);
    const trPapierReel = sumCaisseAmountLabels(text, trPapierLabels);
    const trPapierTheorique = sumCaisseTheoriqueLabels(text, trPapierLabels);
    const trCarteReel = sumCaisseAmountLabels(text, trCarteLabels);
    const trCarteTheorique = sumCaisseTheoriqueLabels(text, trCarteLabels);`,
      'regroupement cb sunday et tr'
    );

    next = replaceRequired(next, "        cb: findCaisseTheoriqueAmount(text, 'CB'),", "        cb: cbTheorique,", 'theorique cb regroupe');
    next = replaceRequired(next, "        tr_carte: findCaisseTheoriqueAmount(text, 'CARTE TR'),", "        tr_carte: trCarteTheorique,", 'theorique tr regroupe');
    next = replaceRequired(next, "        cb: findCaisseAmount(text, 'CB'),", "        cb: cbReel,", 'reel cb regroupe');
    next = replaceRequired(next, "        trCarte: findCaisseAmount(text, 'CARTE TR'),", "        trCarte: trCarteReel,", 'reel tr regroupe');

    return { code: next, map: null };
  },
});
