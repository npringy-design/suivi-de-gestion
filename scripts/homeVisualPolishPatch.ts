import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch finition visuelle accueil non applique : ' + label);
  return code.replace(from, to);
};

const titleBlockSource = `                  <div className="min-w-0 py-0.5">
                    <div className="home-separator mb-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    <h1 className="home-title font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Hippopotamus
                    </h1>
                    <div className="home-separator mt-1.5 h-px max-w-[360px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mt-1.5 max-w-[360px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Thillois
                    </div>
                  </div>`;

const titleBlockReplacement = `                  <div className="min-w-0 py-0.5 text-center lg:pl-[clamp(1.5rem,5vw,6rem)]">
                    <div className="home-separator mx-auto mb-1.5 h-px max-w-[520px] bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    <h1 className="home-title text-center font-serif text-[clamp(2rem,3.4vw,3rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-50 drop-shadow">
                      Hippopotamus
                    </h1>
                    <div className="home-separator mx-auto mt-1.5 h-px max-w-[520px] bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />
                    <div className="home-location mx-auto mt-1.5 max-w-[520px] text-center text-[11px] font-bold uppercase tracking-[0.42em] text-white/85 sm:text-xs">
                      Thillois
                    </div>
                  </div>`;

const summaryFooterSource = `      <div className="home-summary-footer mt-auto border-t border-cyan-100/20 pt-[clamp(0.45rem,0.8vh,0.75rem)]">
        <div className="home-card-description text-xs leading-relaxed text-cyan-50/80">{description}</div>
      </div>`;

const selectedDaySource = `    const selectedDay = now.getFullYear() === year && now.getMonth() === month ? Math.min(now.getDate(), daysInMonth) : 1;`;

const selectedDayReplacement = `    const selectedDay = now.getFullYear() === year && now.getMonth() === month ? Math.max(1, Math.min(now.getDate() - 1, daysInMonth)) : daysInMonth;`;

const weatherIconSource = `      if (code === 0) return <Sun className={\`${'${size}'} text-amber-400\`} />;
      if (code === 1 || code === 2 || code === 3) return <Cloud className={\`${'${size}'} text-slate-300\`} />;`;

const weatherIconReplacement = `      if (code === 0 || code === 1 || code === 2) return <Sun className={\`${'${size}'} text-amber-400\`} />;
      if (code === 3) return <Cloud className={\`${'${size}'} text-slate-300\`} />;`;

const weatherLabelSource = `      case 1:
        return 'Peu nuageux';
      case 2:
        return 'Partiellement nuageux';`;

const weatherLabelReplacement = `      case 1:
        return 'Beau temps';
      case 2:
        return 'Éclaircies';`;

export const homeVisualPolishPatch = (): Plugin => ({
  name: 'home-visual-polish-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    next = replaceRequired(next, titleBlockSource, titleBlockReplacement, 'centrage titre restaurant');
    next = replaceRequired(next, summaryFooterSource, '', 'suppression textes sous kpi');
    next = replaceRequired(next, selectedDaySource, selectedDayReplacement, 'kpi veille');
    next = replaceRequired(next, 'label="CA du Jour"', 'label="CA veille"', 'libelle ca veille');
    next = replaceRequired(next, 'label="Ticket Moyen"', 'label="TM veille"', 'libelle ticket moyen veille');
    next = replaceRequired(next, 'Résultat journalier mesuré aujourd\'hui', 'Résultat de la veille', 'description ca veille');
    next = replaceRequired(next, 'Valeur moyenne par couvert du jour', 'Valeur moyenne par couvert de la veille', 'description tm veille');
    next = replaceRequired(next, '{selectedPeriodDescription} · {selectedPeriodLabel}', "{homePeriod.mode === 'day' ? 'Jour sélectionné' : selectedPeriodDescription + ' · ' + selectedPeriodLabel}", 'badge periode sans double date');
    next = replaceRequired(next, weatherIconSource, weatherIconReplacement, 'icones meteo ciel clair');
    next = replaceRequired(next, weatherLabelSource, weatherLabelReplacement, 'libelles meteo ciel clair');

    return { code: next, map: null };
  },
});
