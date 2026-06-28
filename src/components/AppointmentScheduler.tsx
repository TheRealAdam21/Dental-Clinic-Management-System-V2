
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { dataService } from "@/services/dataService";
import { appointmentSchema } from "@/lib/validationSchemas";
import type { Patient, Dentist, Appointment } from "@/types";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import AppointmentCompletionModalWithXrays from "./AppointmentCompletionModalWithXrays";
import AppointmentRescheduleModal from "./AppointmentRescheduleModal";

const AppointmentScheduler = () => {
  const { isAuthorized, loading: authLoading } = useAuthGuard();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patient_id: "",
    dentist_id: "",
    appointment_date: "",
    appointment_time: "",
    service_type: "",
    notes: ""
  });

  useEffect(() => {
    if (isAuthorized) {
      fetchPatients();
      fetchDentists();
      fetchAppointments();
    }
  }, [isAuthorized]);

  const fetchPatients = async () => {
    try {
      const data = await dataService.getPatients();
      setPatients(data);
    } catch (error) {
      toast.error('Failed to load patients');
    }
  };

  const fetchDentists = async () => {
    try {
      const data = await dataService.getDentists();
      setDentists(data);
    } catch (error) {
      toast.error('Failed to load dentists');
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await dataService.getAppointments();
      setAppointments(data.filter((a) => a.status !== "cancelled" && a.status !== "completed"));
    } catch (_error) {
      toast.error("Failed to load appointments");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAppointmentStatus = async (appointmentId: string, status: Appointment["status"]) => {
    try {
      await dataService.updateAppointment(appointmentId, { status });
      toast.success(`Appointment ${status} successfully`);
      fetchAppointments();
    } catch (_error) {
      toast.error("Failed to update appointment status");
    }
  };

  const requestDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    try {
      await dataService.deleteAppointment(appointmentToDelete.id);
      toast.success("Appointment deleted successfully");
      fetchAppointments();
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (_error) {
      toast.error("Failed to delete appointment");
    }
  };

  const handleCompleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCompletionModalOpen(true);
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthorized) {
      toast.error("Unauthorized access. Please log in as a dentist.");
      return;
    }

    // Check for required fields before validation
    if (!formData.patient_id) {
      toast.error("Please select a patient");
      return;
    }

    if (!formData.dentist_id) {
      toast.error("Please select a dentist");
      return;
    }

    if (!formData.service_type) {
      toast.error("Please select a service type");
      return;
    }

    if (!formData.appointment_date) {
      toast.error("Please select an appointment date");
      return;
    }

    if (!formData.appointment_time) {
      toast.error("Please select an appointment time");
      return;
    }
    
    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;
      
      const appointmentData = {
        patient_id: formData.patient_id,
        dentist_id: formData.dentist_id,
        appointment_datetime: appointmentDateTime,
        service_type: formData.service_type,
        notes: formData.notes || undefined,
        status: 'pending' as const
      };

      appointmentSchema.parse(appointmentData);
      
      await dataService.addAppointment(appointmentData);

      toast.success("Appointment scheduled successfully!");
      fetchAppointments();
      setFormData({
        patient_id: "",
        dentist_id: "",
        appointment_date: "",
        appointment_time: "",
        service_type: "",
        notes: ""
      });
      setIsScheduleDialogOpen(false);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const fieldErrors = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        toast.error(`Validation error: ${fieldErrors}`);
      } else {
        toast.error("Failed to schedule appointment. Please try again.");
      }
    }
  };

  const serviceTypes = [
    "General Checkup",
    "Cleaning",
    "Filling",
    "Root Canal",
    "Crown",
    "Extraction",
    "Whitening",
    "Orthodontic Consultation",
    "Emergency",
    "Other"
  ];

  const dateToKey = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getAppointmentDateKey = (dateTime: string) => {
    const datePart = dateTime.split("T")[0];
    return datePart || dateToKey(new Date(dateTime));
  };

  const formatAppointmentTime = (dateTime: string) => {
    const raw = dateTime.split("T")[1] || "";
    const hhmm = raw.slice(0, 5);
    if (!hhmm || !hhmm.includes(":")) return "--:--";
    const [h, m] = hhmm.split(":").map(Number);
    const hour12 = h % 12 || 12;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${hour12}:${`${m}`.padStart(2, "0")} ${suffix}`;
  };

  const appointmentsByDate = appointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
    const key = getAppointmentDateKey(appointment.appointment_datetime);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(appointment);
    return acc;
  }, {});

  const selectedDate = formData.appointment_date ? new Date(`${formData.appointment_date}T00:00:00`) : undefined;

  const hasAppointmentsMatcher = (date: Date) => {
    return Boolean(appointmentsByDate[dateToKey(date)]?.length);
  };

  const getFirstNamesForDate = (date: Date) => {
    const key = dateToKey(date);
    const names = (appointmentsByDate[key] || [])
      .map((a) => a.patient?.first_name)
      .filter((name): name is string => Boolean(name));
    return names.slice(0, 2);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays: Date[] = [];
  let dayPointer = gridStart;
  while (dayPointer <= gridEnd) {
    calendarDays.push(dayPointer);
    dayPointer = addDays(dayPointer, 1);
  }

  const selectedDayAppointments = selectedCalendarDate
    ? (appointmentsByDate[dateToKey(selectedCalendarDate)] || []).sort(
        (a, b) => new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime()
      )
    : [];

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Unauthorized access. Please log in as a dentist.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6">
          <Label className="mb-2 block">Appointment Calendar</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Click a date to open appointments.
          </p>
          <div className="rounded-md border p-2 sm:p-3">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <Button type="button" size="icon" variant="outline" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold text-sm sm:text-base">{format(currentMonth, "MMMM yyyy")}</div>
              <Button type="button" size="icon" variant="outline" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                <div key={weekday}>{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((date) => {
                const key = dateToKey(date);
                const names = getFirstNamesForDate(date);
                const total = appointmentsByDate[key]?.length || 0;
                const inCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                const hasAppointments = hasAppointmentsMatcher(date);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedCalendarDate(date);
                      setIsDateDialogOpen(true);
                    }}
                    className={[
                      "min-h-[74px] sm:min-h-24 rounded-md border p-1 sm:p-2 text-left transition-colors",
                      inCurrentMonth ? "bg-background hover:bg-accent" : "bg-muted/40 text-muted-foreground",
                      isSelected ? "ring-2 ring-blue-500" : "",
                      hasAppointments ? "border-blue-300" : "",
                    ].join(" ")}
                  >
                    <div className={`text-[11px] sm:text-xs font-semibold ${isToday(date) ? "text-blue-600" : ""}`}>{format(date, "d")}</div>
                    <div className="mt-0.5 sm:mt-1 space-y-0.5">
                      {names.map((name, idx) => (
                        <div
                          key={`${key}-${name}`}
                          className={`text-[9px] sm:text-[10px] truncate ${idx > 0 ? "hidden sm:block" : ""}`}
                        >
                          {name}
                        </div>
                      ))}
                      {total > names.length && (
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground">+{total - names.length}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[88vh] overflow-hidden p-0">
            <div className="p-6 overflow-y-auto max-h-[88vh]">
            <DialogHeader>
              <DialogTitle>
                {selectedCalendarDate ? `Appointments on ${format(selectedCalendarDate, "MMMM d, yyyy")}` : "Appointments"}
              </DialogTitle>
              <DialogDescription>
                Full patient name and appointment time are shown below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedDayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments scheduled for this date.</p>
              ) : (
                selectedDayAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-md border p-3 space-y-2">
                    <div className="font-medium">
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4" />
                      {formatAppointmentTime(appointment.appointment_datetime)}{" "}
                      - {appointment.service_type}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {appointment.status === "pending" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, "approved")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRescheduleAppointment(appointment)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reschedule
                          </Button>
                        </>
                      )}
                      {appointment.status === "approved" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCompleteAppointment(appointment)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRescheduleAppointment(appointment)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reschedule
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => requestDeleteAppointment(appointment)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button
              type="button"
              onClick={() => {
                if (selectedCalendarDate) {
                  handleInputChange("appointment_date", dateToKey(selectedCalendarDate));
                  setIsScheduleDialogOpen(true);
                }
                setIsDateDialogOpen(false);
              }}
            >
              Schedule Patient on This Date
            </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[90vh] overflow-hidden p-0">
            <div className="p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>
                {formData.appointment_date
                  ? `Selected date: ${new Date(`${formData.appointment_date}T00:00:00`).toLocaleDateString()}`
                  : "Choose a date from calendar first."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="patient_id">Patient *</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => handleInputChange("patient_id", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dentist_id">Dentist *</Label>
                  <Select value={formData.dentist_id} onValueChange={(value) => handleInputChange("dentist_id", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dentist" />
                    </SelectTrigger>
                    <SelectContent>
                      {dentists.map((dentist) => (
                        <SelectItem key={dentist.id} value={dentist.id}>
                          Dr. {dentist.first_name} {dentist.last_name}
                          {dentist.specialization && ` - ${dentist.specialization}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="appointment_time">Time *</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => handleInputChange("appointment_time", e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => handleInputChange("service_type", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                    placeholder="Any special requirements or notes..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Schedule Appointment
              </Button>
            </form>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this appointment for{" "}
                <strong>
                  {appointmentToDelete?.patient?.first_name} {appointmentToDelete?.patient?.last_name}
                </strong>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setAppointmentToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDeleteAppointment}>
                Delete Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AppointmentCompletionModalWithXrays
          isOpen={completionModalOpen}
          onClose={() => setCompletionModalOpen(false)}
          appointment={selectedAppointment}
          onComplete={fetchAppointments}
        />

        <AppointmentRescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          appointment={selectedAppointment}
          onReschedule={fetchAppointments}
        />
      </CardContent>
    </Card>
  );
};

export default AppointmentScheduler;
