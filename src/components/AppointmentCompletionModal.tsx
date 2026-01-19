import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AppointmentCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onComplete: () => void;
}

const AppointmentCompletionModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onComplete 
}: AppointmentCompletionModalProps) => {
  const [formData, setFormData] = useState({
    diagnosis: "",
    treatment: "",
    treatment_cost: "",
    notes: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.diagnosis.trim() || !formData.treatment.trim()) {
      toast.error("Diagnosis and treatment are required");
      return;
    }

    try {
      // Create visit record
      const visitData = {
        patient_id: appointment.patient_id,
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        treatment_cost: formData.treatment_cost ? parseFloat(formData.treatment_cost) : null,
        notes: formData.notes || null
      };

      const { error: visitError } = await supabase
        .from('visits')
        .insert(visitData);

      if (visitError) throw visitError;

      // Update appointment status to completed
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (appointmentError) throw appointmentError;

      toast.success("Appointment completed and visit record created!");
      
      // Reset form
      setFormData({
        diagnosis: "",
        treatment: "",
        treatment_cost: "",
        notes: ""
      });
      
      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      toast.error("Failed to complete appointment. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Appointment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange("diagnosis", e.target.value)}
              placeholder="Enter diagnosis..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment">Treatment *</Label>
            <Textarea
              id="treatment"
              value={formData.treatment}
              onChange={(e) => handleInputChange("treatment", e.target.value)}
              placeholder="Enter treatment provided..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment_cost">Treatment Cost (₱)</Label>
            <Input
              id="treatment_cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.treatment_cost}
              onChange={(e) => handleInputChange("treatment_cost", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Complete Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentCompletionModal;