
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { dataService } from "@/services/dataService";
import { appointmentSchema } from "@/lib/validationSchemas";
import type { Patient, Dentist } from "@/types";

const AppointmentScheduler = () => {
  const { isAuthorized, loading: authLoading } = useAuthGuard();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      setFormData({
        patient_id: "",
        dentist_id: "",
        appointment_date: "",
        appointment_time: "",
        service_type: "",
        notes: ""
      });
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
              <Label htmlFor="appointment_date">Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleInputChange("appointment_date", e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
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
      </CardContent>
    </Card>
  );
};

export default AppointmentScheduler;
