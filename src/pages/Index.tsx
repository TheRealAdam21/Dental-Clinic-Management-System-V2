
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DentistDashboardFull from "@/components/DentistDashboardFull";
import ToothMark from "@/components/ToothMark";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user || !userRole) {
        navigate('/auth');
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-md bg-primary text-primary-foreground">
            <ToothMark className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted-foreground">Opening the clinic...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || !userRole) {
    return null;
  }

  return <DentistDashboardFull mode={userRole as 'admin' | 'dentist'} />;
};

export default Index;
