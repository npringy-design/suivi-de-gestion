export const getBrowserStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setBrowserStorageItem = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeBrowserStorageItem = (key: string): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const loadJsonFromBrowserStorage = <T>(key: string, fallback: T): T => {
  const rawValue = getBrowserStorageItem(key);
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

export const saveJsonToBrowserStorage = (key: string, value: unknown): boolean => {
  try {
    return setBrowserStorageItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
};
