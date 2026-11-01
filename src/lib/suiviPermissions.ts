import { getSiteIds, normalizeSiteIds, type SiteId } from '@/lib/sites';

export type SuiviRole = 'super_admin' | 'global_admin' | 'user' | 'admin';

export type SuiviAccessScope = 'all' | 'current_site';

export type SuiviProfileLike = {
  user_id?: string | null;
  id?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  access_scope?: string | null;
  site_ids?: readonly string[] | null;
};

export const normalizeSuiviRole = (role?: string | null): SuiviRole => {
  if (role === 'super_admin' || role === 'global_admin' || role === 'user') return role;
  if (role === 'admin') return 'global_admin';
  return 'user';
};

export const getSuiviRoleLabel = (role?: string | null) => {
  const normalizedRole = normalizeSuiviRole(role);
  if (normalizedRole === 'super_admin') return 'Super admin';
  if (normalizedRole === 'global_admin') return 'Global admin';
  return 'Utilisateur';
};

export const isSuiviAccountActive = (profile: SuiviProfileLike | null | undefined) => profile?.is_active !== false;

export const canAccessUserManagement = (profile: SuiviProfileLike | null | undefined) => {
  if (!profile || !isSuiviAccountActive(profile)) return false;
  const role = normalizeSuiviRole(profile.role);
  return role === 'super_admin' || role === 'global_admin';
};

export const canManageUserTarget = (
  actor: SuiviProfileLike | null | undefined,
  target: SuiviProfileLike | null | undefined,
) => {
  if (!actor || !target || !isSuiviAccountActive(actor)) return false;
  const actorId = actor.user_id || actor.id;
  const targetId = target.user_id || target.id;
  if (actorId && targetId && actorId === targetId) return false;

  const actorRole = normalizeSuiviRole(actor.role);
  const targetRole = normalizeSuiviRole(target.role);

  if (actorRole === 'super_admin') return targetRole !== 'super_admin';
  if (actorRole === 'global_admin') return targetRole === 'user';
  return false;
};

export const getCreatableSuiviRoles = (profile: SuiviProfileLike | null | undefined): SuiviRole[] => {
  const role = normalizeSuiviRole(profile?.role);
  if (role === 'super_admin') return ['global_admin', 'user'];
  if (role === 'global_admin') return ['user'];
  return [];
};

// super_admin et global_admin voient tous les sites sans configuration ; un "user" est
// cantonné aux sites qui lui sont explicitement attribués (table suivi_gestion_user_site_access).
export const hasAllSiteAccess = (profile: SuiviProfileLike | null | undefined): boolean => {
  const role = normalizeSuiviRole(profile?.role);
  return role === 'super_admin' || role === 'global_admin' || profile?.access_scope === 'all';
};

export const siteIdsForProfile = (profile: SuiviProfileLike | null | undefined): SiteId[] => {
  if (hasAllSiteAccess(profile)) return getSiteIds();
  return normalizeSiteIds(profile?.site_ids);
};

export const canAccessSite = (profile: SuiviProfileLike | null | undefined, siteId: SiteId): boolean =>
  hasAllSiteAccess(profile) || siteIdsForProfile(profile).includes(siteId);

// Création de site : réservée au super_admin actif (s'appuie sur la garde de la gestion utilisateurs).
export const canCreateSites = (profile: SuiviProfileLike | null | undefined): boolean =>
  canAccessUserManagement(profile) && normalizeSuiviRole(profile?.role) === 'super_admin';
