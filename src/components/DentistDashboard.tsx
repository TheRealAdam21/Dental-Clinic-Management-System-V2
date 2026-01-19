import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, User, FileText, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { dataService } from "@/services/dataService";
import type { Appointment } from "@/types";
import AppointmentCompletionModalWithXrays from "./AppointmentCompletionModalWithXrays";
import AppointmentRescheduleModal from "./AppointmentRescheduleModal";

const DentistDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { isAuthorized, loading: authLoading } = useAuthGuard();

  useEffect(() => {
    if (isAuthorized) {
      fetchAppointments();
    }
  }, [isAuthorized]);

  const fetchAppointments = async () => {
    if (!isAuthorized) return;
    
    try {
      const data = await dataService.getAppointments();
      setAppointments(data);
    } catch (error) {
      toast.error("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await dataService.updateAppointment(appointmentId, { status } as Partial<Appointment>);
      toast.success(`Appointment ${status} successfully`);
      fetchAppointments();
    } catch (error) {
      toast.error("Failed to update appointment status");
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return;
    }

    try {
      await dataService.deleteAppointment(appointmentId);
      toast.success("Appointment deleted successfully");
      fetchAppointments();
    } catch (error) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", text: "Pending" },
      approved: { color: "bg-green-500", text: "Approved" },
      completed: { color: "bg-blue-500", text: "Completed" },
      cancelled: { color: "bg-red-500", text: "Cancelled" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (authLoading || loading) {
    return <div className="text-center">Loading appointments...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Unauthorized access. Please log in as a dentist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Appointment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {appointments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No appointments scheduled</p>
            ) : (
              appointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.appointment_datetime);
                return (
                  <Card key={appointment.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-lg font-semibold">
                            <User className="h-4 w-4" />
                            {appointment.patient?.first_name} {appointment.patient?.last_name}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {time}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {appointment.service_type}
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <strong>Notes:</strong> {appointment.notes}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Status:</span>
                            {getStatusBadge(appointment.status)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {appointment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateAppointmentStatus(appointment.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRescheduleAppointment(appointment)}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reschedule
                              </Button>
                            </>
                          )}
                          
                          {appointment.status === 'approved' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCompleteAppointment(appointment)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRescheduleAppointment(appointment)}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reschedule
                              </Button>
                            </>
                          )}

                          {(appointment.status === 'approved' || appointment.status === 'completed' || appointment.status === 'cancelled') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteAppointment(appointment.id)}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

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

export default DentistDashboard;
