
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, FileText, LogOut, Stethoscope, UserPlus } from "lucide-react";
import DentistDashboard from "@/components/DentistDashboard";
import PatientList from "@/components/PatientList";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import PatientForm from "@/components/PatientForm";
import PatientRecordsAuth from "@/components/PatientRecordsAuth";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useAuth } from "@/contexts/AuthContext";

const DentistDashboardFull = () => {
  const [activeTab, setActiveTab] = useState("appointments");
  const [isRecordsAuthenticated, setIsRecordsAuthenticated] = useState(false);
  const { signOut, user } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Dental Clinic Management</h1>
              <p className="text-gray-600">Welcome, Dr. {user?.user_metadata?.first_name || user?.email}!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NetworkStatus />
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Patient
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Patient Records
            </TabsTrigger>
          </TabsList>

          {/* Appointment Management */}
          <TabsContent value="appointments" className="space-y-6">
            <DentistDashboard />
          </TabsContent>

          {/* Appointment Scheduling */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule New Appointment</h2>
              <p className="text-gray-600">Create appointments for patients</p>
            </div>
            <AppointmentScheduler />
          </TabsContent>

          {/* Patient Registration */}
          <TabsContent value="patients" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Register New Patient</h2>
              <p className="text-gray-600">Add patient information to the system</p>
            </div>
            <PatientForm />
          </TabsContent>

          {/* Patient Records with Password Protection */}
          <TabsContent value="records" className="space-y-6">
            {!isRecordsAuthenticated ? (
              <PatientRecordsAuth 
                onAuthenticated={() => setIsRecordsAuthenticated(true)}
                userEmail={user?.email || ""}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Patient Records</h2>
                  <p className="text-gray-600">View and manage patient visits and payments</p>
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
