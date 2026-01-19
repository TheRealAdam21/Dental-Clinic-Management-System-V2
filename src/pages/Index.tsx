
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DentistDashboardFull from "@/components/DentistDashboardFull";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user || userRole !== 'dentist') {
        navigate('/auth');
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || userRole !== 'dentist') {
    return null;
  }

  return <DentistDashboardFull />;
};

export default Index;
