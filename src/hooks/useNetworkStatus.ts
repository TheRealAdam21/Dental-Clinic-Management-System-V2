import { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { syncService } from '@/services/syncService';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      db.appState.update(1, { isOnline: true });
      syncService.syncAll().catch((error) => {
        console.error('Auto sync on reconnect failed:', error);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      db.appState.update(1, { isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncService.syncAll().catch((error) => {
        console.error('Initial sync check failed:', error);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
