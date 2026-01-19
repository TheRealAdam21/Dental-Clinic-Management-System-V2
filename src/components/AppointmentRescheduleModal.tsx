import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AppointmentRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onReschedule: () => void;
}

const AppointmentRescheduleModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onReschedule 
}: AppointmentRescheduleModalProps) => {
  const [formData, setFormData] = useState({
    appointment_date: "",
    appointment_time: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appointment_date || !formData.appointment_time) {
      toast.error("Please select both date and time");
      return;
    }

    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;
      
      // Update appointment with new datetime
      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_datetime: appointmentDateTime,
          status: 'pending' // Reset status to pending for rescheduled appointments
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success("Appointment rescheduled successfully!");
      
      // Reset form
      setFormData({
        appointment_date: "",
        appointment_time: ""
      });
      
      onReschedule();
      onClose();
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      toast.error("Failed to reschedule appointment. Please try again.");
    }
  };

  const formatCurrentDateTime = () => {
    if (!appointment?.appointment_datetime) return { date: '', time: '' };
    
    const date = new Date(appointment.appointment_datetime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const currentDateTime = formatCurrentDateTime();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {appointment && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Patient:</strong> {appointment.patient?.first_name} {appointment.patient?.last_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Current Date:</strong> {currentDateTime.date}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Current Time:</strong> {currentDateTime.time}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appointment_date">New Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleInputChange("appointment_date", e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_time">New Time *</Label>
              <Input
                id="appointment_time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) => handleInputChange("appointment_time", e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Reschedule Appointment
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentRescheduleModal;