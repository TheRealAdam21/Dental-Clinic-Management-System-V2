import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { DATA_SYNCED_EVENT, syncService } from '@/services/syncService';
import { toast } from 'sonner';

export const NetworkStatus = () => {
  const { isOnline } = useNetworkStatus();
  const [pendingSync, setPendingSync] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const wasOnlineRef = useRef(isOnline);

  const refreshPendingState = useCallback(async () => {
    const count = await syncService.getPendingSyncCount();
    setPendingSync(count);
    setLastError(await syncService.getPendingSyncError());
  }, []);

  useEffect(() => {
    void refreshPendingState();
    const interval = setInterval(() => {
      void refreshPendingState();
    }, 5000);

    const handleSynced = () => {
      void refreshPendingState();
    };
    window.addEventListener(DATA_SYNCED_EVENT, handleSynced);

    return () => {
      clearInterval(interval);
      window.removeEventListener(DATA_SYNCED_EVENT, handleSynced);
    };
  }, [refreshPendingState]);

  const handleSync = useCallback(async (silent = false) => {
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    try {
      // A manual or reconnect sync resets the retry cap so stranded items get
      // another chance instead of waiting forever.
      await syncService.syncAll({ force: true });
      await refreshPendingState();

      if (!silent) {
        const count = await syncService.getPendingSyncCount();
        if (count === 0) {
          toast.success('All changes synced to the cloud');
        } else {
          toast.error(`${count} change(s) could not be uploaded yet. Open the badge for details.`);
        }
      }
    } catch (error) {
      if (!silent) {
        toast.error('Sync failed. Will retry automatically.');
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshPendingState]);

  // Only sync when connectivity is restored, not on every render.
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current && pendingSync > 0) {
      void handleSync(true);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, pendingSync, handleSync]);

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>

      {pendingSync > 0 && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 cursor-pointer hover:bg-muted"
          onClick={() => handleSync(false)}
          title={lastError
            ? `${pendingSync} change(s) waiting to upload. Last error: ${lastError}`
            : `${pendingSync} change(s) waiting to upload`}
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {pendingSync} pending
        </Badge>
      )}
    </div>
  );
};
