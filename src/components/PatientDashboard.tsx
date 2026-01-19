
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, UserPlus, LogOut } from "lucide-react";
import PatientForm from "@/components/PatientForm";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import { useAuth } from "@/contexts/AuthContext";

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Patient Portal</h1>
            <p className="text-gray-600">Welcome back, {user?.user_metadata?.first_name}!</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Book Appointment
            </TabsTrigger>
          </TabsList>

          {/* Profile Management */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Update Profile Information
                </CardTitle>
                <CardDescription>
                  Keep your information up to date for better care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatientForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointment Scheduling */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Schedule New Appointment
                </CardTitle>
                <CardDescription>
                  Book your next dental appointment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentScheduler />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientDashboard;
