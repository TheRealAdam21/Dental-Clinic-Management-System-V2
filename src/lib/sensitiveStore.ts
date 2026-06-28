const store = new Map<string, string>();

export const sensitiveStore = {
  set(key: string, value: string): void {
    store.set(key, value);
  },

  get(key: string): string | undefined {
    return store.get(key);
  },

  has(key: string): boolean {
    return store.has(key);
  },

  delete(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },
};

export const SENSITIVE_KEYS = {
  AUTH_PASSWORD: 'auth.password',
} as const;
