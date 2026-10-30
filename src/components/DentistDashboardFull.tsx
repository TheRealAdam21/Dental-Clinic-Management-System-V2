import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, FileText, LogOut, UserPlus } from "lucide-react";
import { format } from "date-fns";
import PatientList from "@/components/PatientList";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import PatientForm from "@/components/PatientForm";
import PatientRecordsAuth from "@/components/PatientRecordsAuth";
import AdminDentistManager from "@/components/AdminDentistManager";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import ToothMark from "@/components/ToothMark";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useNativeAppointmentNotifications } from "@/hooks/useNativeAppointmentNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type DashboardMode = "admin" | "dentist";

const DentistDashboardFull = ({ mode }: { mode: DashboardMode }) => {
  const [activeTab, setActiveTab] = useState("appointments");
  const [isRecordsAuthenticated, setIsRecordsAuthenticated] = useState(mode === "admin");
  const { signOut, user } = useAuth();
  const isAdmin = mode === "admin";
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

  const tabTriggerClass =
    "flex-none gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 pt-1 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <ToothMark className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg leading-none">Dental Clinic</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {format(new Date(), "EEE, MMM d")}
            </span>
            <NetworkStatus />
            <ThemeToggle />
            <span className="hidden h-7 w-px bg-border sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-tight">
                {isAdmin ? "Admin" : `Dr. ${user?.user_metadata?.first_name ?? user?.email ?? ""}`}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8 flex w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="appointments" className={tabTriggerClass}>
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="patients" className={tabTriggerClass}>
              <UserPlus className="h-4 w-4" />
              New Patient
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="dentists" className={tabTriggerClass}>
                <Users className="h-4 w-4" />
                Dentists
              </TabsTrigger>
            )}
            <TabsTrigger value="records" className={tabTriggerClass}>
              <FileText className="h-4 w-4" />
              Patient Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-2xl sm:text-3xl">Appointments</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Review the month, open a day to approve or complete visits, and book patients directly
                from the calendar.
              </p>
            </div>
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-2xl sm:text-3xl">New Patient</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter the details manually, or scan a printed record to fill the form.
              </p>
            </div>
            <PatientForm />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="dentists" className="space-y-6">
              <div className="max-w-2xl">
                <h1 className="font-display text-2xl sm:text-3xl">Dentists</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Manage the dentists patients can be scheduled with.
                </p>
              </div>
              <AdminDentistManager />
            </TabsContent>
          )}

          <TabsContent value="records" className="space-y-6">
            {!isRecordsAuthenticated ? (
              <PatientRecordsAuth onAuthenticated={() => setIsRecordsAuthenticated(true)} />
            ) : (
              <>
                <div className="max-w-2xl">
                  <h1 className="font-display text-2xl sm:text-3xl">Patient Records</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Visit history, X-rays, certificates and payments.
                  </p>
                </div>
                <PatientList showVisits={true} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DentistDashboardFull;
