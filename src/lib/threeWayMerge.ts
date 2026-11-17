// Fusion à trois voies d'objets JSON simples (base = dernière valeur connue de ce poste, local = valeur
// de ce poste, remote = valeur actuelle du cloud). Récursive sur les objets ; tableaux et valeurs
// primitives sont des feuilles comparées par JSON.stringify.
//
// Pour chaque clé : local différent de base → local ; sinon → remote. Une clé supprimée en local
// (présente dans base, absente de local) est supprimée. Un conflit est un chemin où local, remote et
// base diffèrent tous les trois : local gagne.

type JsonObject = Record<string, unknown>;

export type ThreeWayMergeResult<T> = {
  merged: T;
  conflicts: string[];
};

const isPlainObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

type Slot = { present: boolean; value: unknown };

const slotOf = (container: JsonObject | null, key: string): Slot =>
  container !== null && Object.prototype.hasOwnProperty.call(container, key)
    ? { present: true, value: container[key] }
    : { present: false, value: undefined };

const slotsEqual = (a: Slot, b: Slot): boolean =>
  a.present === b.present && (!a.present || sameValue(a.value, b.value));

const joinPath = (parent: string, key: string): string => (parent === '' ? key : `${parent}.${key}`);

// Fusionne les trois versions d'une même valeur située à `path`.
function mergeSlots(path: string, base: Slot, local: Slot, remote: Slot, conflicts: string[]): Slot {
  // Objets des deux côtés : on descend clé par clé (base absente ou non objet = objet vide).
  if (local.present && remote.present && isPlainObject(local.value) && isPlainObject(remote.value)) {
    const baseObject = base.present && isPlainObject(base.value) ? base.value : {};
    const merged: JsonObject = {};
    const keys = new Set([...Object.keys(baseObject), ...Object.keys(local.value), ...Object.keys(remote.value)]);
    keys.forEach(key => {
      const result = mergeSlots(joinPath(path, key), slotOf(baseObject, key), slotOf(local.value as JsonObject, key), slotOf(remote.value as JsonObject, key), conflicts);
      if (result.present) merged[key] = result.value;
    });
    return { present: true, value: merged };
  }

  const localChanged = !slotsEqual(local, base);
  if (!localChanged) return remote;

  const remoteChanged = !slotsEqual(remote, base);
  if (remoteChanged && !slotsEqual(local, remote)) conflicts.push(path === '' ? '(racine)' : path);
  return local;
}

export function threeWayMerge<T>(base: T | undefined, local: T, remote: T | undefined): ThreeWayMergeResult<T> {
  // Pas de version distante : rien à fusionner.
  if (remote === undefined) return { merged: local, conflicts: [] };

  const conflicts: string[] = [];
  const result = mergeSlots(
    '',
    { present: base !== undefined, value: base },
    { present: true, value: local },
    { present: true, value: remote },
    conflicts,
  );
  return { merged: (result.present ? result.value : local) as T, conflicts };
}
