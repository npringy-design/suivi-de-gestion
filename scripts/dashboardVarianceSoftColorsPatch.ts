import type { Plugin } from 'vite';

export const dashboardVarianceSoftColorsPatch = (): Plugin => ({
  name: 'dashboard-variance-soft-colors-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('src/Dashboard.tsx')) return null;
    const from = "                    let textColorClass = isMonthTotal ? 'text-amber-900' : 'text-slate-800';\n                    if (c[2] === 'ECART AU\\nBUDGET\\nJOUR' && val !== '') {\n                      const numVal = parseFloat(val);\n                      if (numVal > 0) textColorClass = 'text-green-600 font-bold';\n                      else if (numVal < 0) textColorClass = 'text-red-600 font-bold';\n                    }";
    const to = "                    let textColorClass = isMonthTotal ? 'text-amber-900' : 'text-slate-800';\n                    const isVarianceCol = c[1].includes('ECART') || c[2].includes('ECART') || [22, 31, 33, 117, 122].includes(originalCIdx);\n                    if ((c[2] === 'ECART AU\\nBUDGET\\nJOUR' || isVarianceCol) && val !== '') {\n                      const numVal = parseFloat(String(val).replace(',', '.'));\n                      if (numVal > 0) {\n                        textColorClass = 'text-emerald-800 font-bold';\n                        if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-emerald-50';\n                      } else if (numVal < 0) {\n                        textColorClass = 'text-red-800 font-bold';\n                        if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-red-50';\n                      }\n                    }";
    if (!code.includes(from)) return null;
    return { code: code.replace(from, to), map: null };
  },
});
