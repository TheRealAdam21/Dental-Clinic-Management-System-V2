import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncService } from '@/services/syncService';
import { toast } from 'sonner';

export const NetworkStatus = () => {
  const { isOnline } = useNetworkStatus();
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await syncService.getPendingSyncCount();
      setPendingSync(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = useCallback(async (silent = false) => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      await syncService.syncAll();
      const count = await syncService.getPendingSyncCount();
      setPendingSync(count);
      if (!silent) {
        toast.success(count === 0 ? 'Data synced successfully' : 'Sync completed with pending items');
      }
    } catch (error) {
      if (!silent) {
        toast.error('Sync failed. Will retry automatically.');
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    if (isOnline && pendingSync > 0) {
      handleSync(true);
    }
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
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100"
          onClick={() => handleSync(false)}
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {pendingSync} pending
        </Badge>
      )}
    </div>
  );
};
