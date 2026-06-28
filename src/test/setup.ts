import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';
import { db } from '@/services/db';

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

afterEach(async () => {
  await Promise.all([
    db.dentists.clear(),
    db.patients.clear(),
    db.appState.clear(),
  ]);
  vi.clearAllMocks();
});
