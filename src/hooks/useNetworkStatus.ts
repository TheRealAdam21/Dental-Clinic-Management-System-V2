import { useState, useEffect } from 'react';
import { db } from '@/services/db';

/**
 * Tracks browser connectivity for the UI. Pushing/pulling is handled globally by
 * startAutoSync(), so this hook only mirrors the state into appState.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void db.appState.update(1, { isOnline: true });
    };

    const handleOffline = () => {
      setIsOnline(false);
      void db.appState.update(1, { isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
