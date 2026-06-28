
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, FileText, LogOut, Stethoscope, UserPlus } from "lucide-react";
import PatientList from "@/components/PatientList";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import PatientForm from "@/components/PatientForm";
import PatientRecordsAuth from "@/components/PatientRecordsAuth";
import AdminDentistManager from "@/components/AdminDentistManager";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useNativeAppointmentNotifications } from "@/hooks/useNativeAppointmentNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type DashboardMode = 'admin' | 'dentist';

const DentistDashboardFull = ({ mode }: { mode: DashboardMode }) => {
  const [activeTab, setActiveTab] = useState("appointments");
  const [isRecordsAuthenticated, setIsRecordsAuthenticated] = useState(mode === 'admin');
  const { signOut, user } = useAuth();
  const isAdmin = mode === 'admin';
  useAppointmentNotifications(user);
  useNativeAppointmentNotifications(user);
  usePushNotifications(user);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Reset records authentication when switching away from records
    if (value !== "records") {
      setIsRecordsAuthenticated(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Dental Clinic Management</h1>
              <p className="text-gray-600 dark:text-gray-300">
                {isAdmin
                  ? "Welcome, Admin!"
                  : `Welcome, Dr. ${user?.user_metadata?.first_name || user?.email}!`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <NetworkStatus />
            <ThemeToggle />
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full mb-8 flex overflow-x-auto whitespace-nowrap gap-2 p-1">
            <TabsTrigger value="appointments" className="flex-none flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex-none flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Patient
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="dentists" className="flex-none flex items-center gap-2">
                <Users className="h-4 w-4" />
                Dentists
              </TabsTrigger>
            )}
            <TabsTrigger value="records" className="flex-none flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Patient Records
            </TabsTrigger>
          </TabsList>

          {/* Appointment Management */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Appointments</h2>
              <p className="text-gray-600 dark:text-gray-300">Use calendar date popups to manage and schedule appointments.</p>
            </div>
            <AppointmentScheduler />
          </TabsContent>

          {/* Patient Registration */}
          <TabsContent value="patients" className="space-y-6">
            <PatientForm />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="dentists" className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Manage Dentists</h2>
                <p className="text-gray-600 dark:text-gray-300">Admin can add/edit dentists for appointment scheduling.</p>
              </div>
              <AdminDentistManager />
            </TabsContent>
          )}

          {/* Patient Records with Password Protection */}
          <TabsContent value="records" className="space-y-6">
            {!isRecordsAuthenticated ? (
              <PatientRecordsAuth 
                onAuthenticated={() => setIsRecordsAuthenticated(true)}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Patient Records</h2>
                  <p className="text-gray-600 dark:text-gray-300">View and manage patient visits and payments</p>
                </div>
                <PatientList showVisits={true} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DentistDashboardFull;
