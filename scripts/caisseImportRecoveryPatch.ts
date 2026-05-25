import type { Plugin } from 'vite';

const fixedHelper = `const findCaisseTtcByRate = (source: string, rate: '5,5' | '10' | '20') => {
    const text = source.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ');
    const headerMatch = text.match(/TVA\\s+TOTAL\\s+HT\\s+TVA\\s+TTC/i);
    if (!headerMatch || headerMatch.index === undefined) return 0;
    const block = text.slice(headerMatch.index, headerMatch.index + 450);
    const rateRegex = rate === '5,5' ? /TVA\\s*5[,\\.]5\\s*%/i : rate === '10' ? /TVA\\s*10\\s*%/i : /TVA\\s*20\\s*%/i;
    const rateMatch = block.match(rateRegex);
    if (!rateMatch || rateMatch.index === undefined) return 0;
    const afterRate = block.slice(rateMatch.index + rateMatch[0].length);
    const nextRow = afterRate.search(/TVA\\s*(?:5[,\\.]5|10|20)\\s*%|\\bTOTAL\\b/i);
    const rowText = nextRow >= 0 ? afterRate.slice(0, nextRow) : afterRate.slice(0, 160);
    const amounts = extractCaisseNumbers(rowText);
    const ht = amounts[2] || amounts[0] || 0;
    const coeff = rate === '5,5' ? 1.055 : rate === '10' ? 1.10 : 1.20;
    return Math.round(ht * coeff * 100) / 100;
  };`;

export const caisseImportRecoveryPatch = (): Plugin => ({
  name: 'caisse-import-recovery-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = next.replace(
      "const text = isPdf ? await extractPdfLayoutText(currentFile, undefined, false) : await currentFile.text();",
      "const text = isPdf ? await extractPdfText(currentFile) : await currentFile.text();"
    );

    next = next.replace(
      "? await extractPdfLayoutText(file, undefined, false)\n        : await file.text();",
      "? await extractPdfText(file)\n        : await file.text();"
    );

    next = next.replace(
      /const findCaisseTtcByRate = \(source: string, rate: '5,5' \| '10' \| '20'\) => \{[\s\S]*?\n  \};\n\n  const parseInvoiceNumber/,
      fixedHelper + "\n\n  const parseInvoiceNumber"
    );

    return { code: next, map: null };
  },
});
