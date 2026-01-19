import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isOnline && pendingSync > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      await syncService.syncAll();
      toast.success('Data synced successfully');
      setPendingSync(0);
    } catch (error) {
      toast.error('Sync failed. Will retry automatically.');
    } finally {
      setSyncing(false);
    }
  };

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
          onClick={handleSync}
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {pendingSync} pending
        </Badge>
      )}
    </div>
  );
};
