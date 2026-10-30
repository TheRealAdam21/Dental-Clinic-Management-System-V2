import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { dataService } from "@/services/dataService";
import { DATA_SYNCED_EVENT } from "@/services/syncService";
import { appointmentSchema } from "@/lib/validationSchemas";
import { buildMonthGrid, isDayInMonth } from "@/lib/calendarGrid";
import { cn } from "@/lib/utils";
import type { Patient, Dentist, Appointment } from "@/types";
import { addMonths, format, isSameDay, isToday, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import AppointmentCompletionModalWithXrays from "./AppointmentCompletionModalWithXrays";
import AppointmentRescheduleModal from "./AppointmentRescheduleModal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [hours, minutes] = hhmm.split(":").map(Number);
  const hour12 = hours % 12 || 12;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${`${minutes}`.padStart(2, "0")} ${suffix}`;
};

const AppointmentScheduler = () => {
  const { isAuthorized, loading: authLoading } = useAuthGuard();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
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

  const fetchPatients = useCallback(async () => {
    try {
      const data = await dataService.getPatients();
      setPatients(data);
    } catch (_error) {
      toast.error("Failed to load patients");
    }
  }, []);

  const fetchDentists = useCallback(async () => {
    try {
      const data = await dataService.getDentists();
      setDentists(data);
    } catch (_error) {
      toast.error("Failed to load dentists");
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const data = await dataService.getAppointments();
      setAppointments(data.filter((appointment) => appointment.status !== "cancelled"));
    } catch (_error) {
      toast.error("Failed to load appointments");
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void fetchPatients();
      void fetchDentists();
      void fetchAppointments();
    }
  }, [isAuthorized, fetchPatients, fetchDentists, fetchAppointments]);

  // Refresh the calendar when a background sync brings in changes from other devices.
  useEffect(() => {
    const handleSynced = () => {
      void fetchAppointments();
    };
    window.addEventListener(DATA_SYNCED_EVENT, handleSynced);
    return () => window.removeEventListener(DATA_SYNCED_EVENT, handleSynced);
  }, [fetchAppointments]);

  const monthGrid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  // One pass over the appointments, sorted per day; cells then do a map lookup
  // instead of filtering the whole list on every render.
  const appointmentsByDate = useMemo(() => {
    const byDate = new Map<string, Appointment[]>();

    for (const appointment of appointments) {
      const key = getAppointmentDateKey(appointment.appointment_datetime);
      const existing = byDate.get(key);
      if (existing) {
        existing.push(appointment);
      } else {
        byDate.set(key, [appointment]);
      }
    }

    for (const dayAppointments of byDate.values()) {
      dayAppointments.sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));
    }

    return byDate;
  }, [appointments]);

  const monthAppointmentCount = useMemo(
    () =>
      monthGrid.days.reduce((total, day) => {
        if (!isDayInMonth(day, monthGrid.monthStart)) return total;
        return total + (appointmentsByDate.get(dateToKey(day))?.length ?? 0);
      }, 0),
    [monthGrid, appointmentsByDate]
  );

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((month) => subMonths(month, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((month) => addMonths(month, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(startOfMonth(new Date()));
  }, []);

  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: Appointment["status"]) => {
    try {
      await dataService.updateAppointment(appointmentId, { status });
      toast.success(`Appointment ${status} successfully`);
      void fetchAppointments();
    } catch (_error) {
      toast.error("Failed to update appointment status");
    }
  }, [fetchAppointments]);

  const requestDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    try {
      await dataService.deleteAppointment(appointmentToDelete.id);
      toast.success("Appointment deleted successfully");
      void fetchAppointments();
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthorized) {
      toast.error("Unauthorized access. Please log in as a dentist.");
      return;
    }

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
        status: "pending" as const
      };

      appointmentSchema.parse(appointmentData);

      await dataService.addAppointment(appointmentData);

      toast.success("Appointment scheduled successfully!");
      void fetchAppointments();
      setFormData({
        patient_id: "",
        dentist_id: "",
        appointment_date: "",
        appointment_time: "",
        service_type: "",
        notes: ""
      });
      setIsScheduleDialogOpen(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        const issues = (error as Error & { errors?: Array<{ path: string[]; message: string }> }).errors ?? [];
        const fieldErrors = issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
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

  const selectedDate = formData.appointment_date ? new Date(`${formData.appointment_date}T00:00:00`) : undefined;

  const selectedDayAppointments = useMemo(
    () => (selectedCalendarDate ? appointmentsByDate.get(dateToKey(selectedCalendarDate)) ?? [] : []),
    [selectedCalendarDate, appointmentsByDate]
  );

  if (authLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">Unauthorized access. Please log in as a dentist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-xl leading-none tracking-tight">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {monthGrid.daysInMonth} days
              <span className="mx-1.5 text-border">/</span>
              {monthAppointmentCount} scheduled appointment{monthAppointmentCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" onClick={goToToday}>
              Today
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthGrid.days.map((date) => {
            const key = dateToKey(date);
            const dayAppointments = appointmentsByDate.get(key) ?? [];
            const total = dayAppointments.length;
            const inCurrentMonth = isDayInMonth(date, monthGrid.monthStart);
            const today = isToday(date);
            const selected = selectedDate ? isSameDay(date, selectedDate) : false;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedCalendarDate(date);
                  setIsDateDialogOpen(true);
                }}
                aria-label={`${format(date, "EEEE, MMMM d, yyyy")}${
                  total > 0 ? `, ${total} appointment${total === 1 ? "" : "s"}` : ", no appointments"
                }`}
                aria-current={today ? "date" : undefined}
                className={cn(
                  "min-h-[86px] border-b border-r border-border/60 p-1.5 text-left transition-colors last:border-r-0 sm:min-h-[104px] sm:p-2",
                  "[&:nth-child(7n)]:border-r-0",
                  inCurrentMonth ? "bg-card hover:bg-accent/50" : "bg-muted/20 text-muted-foreground/60 hover:bg-muted/40",
                  today && inCurrentMonth && "bg-accent/40",
                  selected && "ring-1 ring-inset ring-primary"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:text-xs",
                    today
                      ? "bg-primary text-primary-foreground"
                      : inCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/70"
                  )}
                >
                  {format(date, "d")}
                </span>

                {total > 0 && (
                  <span className="mt-1 flex min-w-0 flex-col gap-0.5">
                    {dayAppointments.slice(0, 2).map((appointment, index) => (
                      <span
                        key={appointment.id}
                        className={cn(
                          "truncate rounded-sm px-1 py-0.5 text-[9px] leading-tight sm:text-[10px]",
                          appointment.status === "completed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-accent text-accent-foreground",
                          index > 0 && "hidden sm:block"
                        )}
                      >
                        {formatAppointmentTime(appointment.appointment_datetime)}{" "}
                        {appointment.patient?.first_name ?? "Patient"}
                      </span>
                    ))}
                    {total > 2 && (
                      <span className="px-1 text-[9px] text-muted-foreground sm:text-[10px]">
                        +{total - 2} more
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Select a date to view its appointments or book a patient. Completed visits stay visible on the
        calendar for reference.
      </p>

      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="w-[95vw] p-0 sm:max-w-2xl">
          <div className="max-h-[88vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="font-display">
                {selectedCalendarDate ? format(selectedCalendarDate, "EEEE, MMMM d, yyyy") : "Appointments"}
              </DialogTitle>
              <DialogDescription>
                {selectedDayAppointments.length === 0
                  ? "No appointments scheduled for this date."
                  : `${selectedDayAppointments.length} appointment${
                      selectedDayAppointments.length === 1 ? "" : "s"
                    } scheduled.`}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              {selectedDayAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatAppointmentTime(appointment.appointment_datetime)}
                        <span className="text-border">/</span>
                        {appointment.service_type}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        appointment.status === "pending" && "bg-amber-100 text-amber-800",
                        appointment.status === "approved" && "bg-emerald-100 text-emerald-800",
                        appointment.status === "completed" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateAppointmentStatus(appointment.id, "approved")}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRescheduleAppointment(appointment)}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
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
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Mark Complete
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRescheduleAppointment(appointment)}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Reschedule
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => requestDeleteAppointment(appointment)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              className="mt-4 w-full sm:w-auto"
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
        <DialogContent className="w-[96vw] p-0 sm:max-w-3xl">
          <div className="max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="font-display">Schedule New Appointment</DialogTitle>
              <DialogDescription>
                {formData.appointment_date
                  ? `Selected date: ${new Date(`${formData.appointment_date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}`
                  : "Choose a date from the calendar first."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="patient_id">Patient *</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => handleInputChange("patient_id", value)} required>
                    <SelectTrigger id="patient_id">
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
                    <SelectTrigger id="dentist_id">
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
                    onChange={(event) => handleInputChange("appointment_time", event.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => handleInputChange("service_type", value)} required>
                    <SelectTrigger id="service_type">
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
                    onChange={(event) => handleInputChange("notes", event.target.value)}
                    rows={3}
                    placeholder="Any special requirements or notes..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
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
    </div>
  );
};

export default AppointmentScheduler;
