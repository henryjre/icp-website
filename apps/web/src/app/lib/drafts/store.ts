const draftStore = new Map<string, unknown>();

export function getDraft<T>(key: string, fallback: T): T {
  const value = draftStore.get(key);
  if (value === undefined) return fallback;
  return value as T;
}

export function setDraft<T>(key: string, value: T): void {
  draftStore.set(key, value);
}

export function clearDraft(key: string): void {
  draftStore.delete(key);
}
