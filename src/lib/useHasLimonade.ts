import { useAuthSession } from '@/AuthGate';
import { siteHasLimonade } from '@/lib/sites';

// Lit le site actif et dit s'il a une activité limonade (voir siteHasLimonade).
export const useHasLimonade = (): boolean => {
  const { activeSiteId } = useAuthSession();
  return siteHasLimonade(activeSiteId);
};
