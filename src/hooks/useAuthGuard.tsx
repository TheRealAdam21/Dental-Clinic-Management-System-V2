
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useAuthGuard = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to access this feature");
    }
  }, [user, loading]);

  return {
    isAuthenticated: !!user,
    isAuthorized: !!user,
    loading
  };
};
