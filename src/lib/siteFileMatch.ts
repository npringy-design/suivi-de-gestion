import { getSiteLabel, getSites, type SiteBrand, type SiteDefinition, type SiteId } from '@/lib/sites';

const BRAND_TOKENS: Record<SiteBrand, string[]> = {
  hippo: ['HIP', 'HIPPO', 'HIPPOPOTAMUS'],
  au_bureau: ['BURO', 'BUREAU'],
};
const NON_LOCATION_WORDS = new Set(['AU', 'BUREAU', 'BURO', 'HIP', 'HIPPO', 'HIPPOPOTAMUS', 'LE', 'LA', 'LES', 'DE', 'DU']);

const tokenize = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

const locationWords = (site: SiteDefinition): string[] => tokenize(site.label).filter(word => !NON_LOCATION_WORDS.has(word) && word.length >= 4);

// Sites dont le nom de lieu apparaît dans un nom de fichier ou un texte importé (abréviations comprises :
// « HIP THILL », « BURO CORM »). Si une enseigne est citée, seuls les sites de cette enseigne sont retenus ;
// sans lieu reconnu, tous les sites de l'enseigne citée.
export const detectSitesInText = (text: string): SiteDefinition[] => {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  const brands = (Object.keys(BRAND_TOKENS) as SiteBrand[]).filter(brand => BRAND_TOKENS[brand].some(token => tokenSet.has(token)));
  const candidates = getSites().filter(site => brands.length === 0 || brands.includes(site.brand));
  const byLocation = candidates.filter(site =>
    locationWords(site).some(word => tokens.some(token => token.length >= 4 && word.startsWith(token))));
  // Enseigne citée sans lieu reconnu (ex. site « Au Bureau » sans nom de ville) : tous les sites de l'enseigne.
  return byLocation.length > 0 || brands.length === 0 ? byLocation : candidates;
};

// Message d'alerte si le fichier semble appartenir à un autre restaurant que le site actif ; null sinon
// (aucun site reconnu, ou le site actif fait partie des sites reconnus).
export const foreignSiteWarning = (text: string, activeSiteId: SiteId): string | null => {
  const sites = detectSitesInText(text);
  if (sites.length === 0 || sites.some(site => site.siteId === activeSiteId)) return null;
  return `Ce fichier semble concerner « ${sites.map(site => site.label).join(' / ')} » alors que vous êtes sur « ${getSiteLabel(activeSiteId)} ».`;
};
