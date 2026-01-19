import { useState, useEffect } from 'react';
import { db } from '@/services/db';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      db.appState.update(1, { isOnline: true });
    };

    const handleOffline = () => {
      setIsOnline(false);
      db.appState.update(1, { isOnline: false });
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
