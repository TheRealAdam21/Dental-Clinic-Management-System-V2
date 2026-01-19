
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, DollarSign } from "lucide-react";
import XrayImageUpload from "./XrayImageUpload";

interface AppointmentCompletionModalWithXraysProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AppointmentCompletionModalWithXrays = ({ 
  appointment, 
  isOpen, 
  onClose, 
  onComplete 
}: AppointmentCompletionModalWithXraysProps) => {
  const [formData, setFormData] = useState({
    diagnosis: "",
    treatment: "",
    treatment_cost: "",
    notes: "",
    visit_date: new Date().toISOString().split('T')[0]
  });
  const [xrayImages, setXrayImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleXrayImagesChange = (images: string[]) => {
    setXrayImages(images);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create visit record
      const { error: visitError } = await supabase
        .from('visits')
        .insert([{
          ...formData,
          patient_id: appointment.patient_id,
          treatment_cost: formData.treatment_cost ? parseFloat(formData.treatment_cost) : null,
          xray_images: xrayImages.length > 0 ? xrayImages : null
        }]);

      if (visitError) throw visitError;

      // Update patient's X-ray images if any were added
      if (xrayImages.length > 0) {
        // Fetch existing patient X-rays
        const { data: patientData } = await supabase
          .from('patients')
          .select('xray_images')
          .eq('id', appointment.patient_id)
          .single();

        const existingXrays = patientData?.xray_images || [];
        const allXrays = [...existingXrays, ...xrayImages];

        // Update patient record with combined X-rays
        const { error: updateError } = await supabase
          .from('patients')
          .update({ xray_images: allXrays })
          .eq('id', appointment.patient_id);

        if (updateError) {
          console.error('Error updating patient X-rays:', updateError);
        }
      }

      // Mark appointment as completed
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (appointmentError) throw appointmentError;

      toast.success("Appointment completed and visit record created successfully!");
      onComplete();
      onClose();
      
      // Reset form
      setFormData({
        diagnosis: "",
        treatment: "",
        treatment_cost: "",
        notes: "",
        visit_date: new Date().toISOString().split('T')[0]
      });
      setXrayImages([]);
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error("Failed to complete appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Appointment & Create Visit Record</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit_date">Visit Date *</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  id="visit_date"
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => handleInputChange("visit_date", e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="treatment_cost">Treatment Cost (₱)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <Input
                  id="treatment_cost"
                  type="number"
                  step="0.01"
                  value={formData.treatment_cost}
                  onChange={(e) => handleInputChange("treatment_cost", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange("diagnosis", e.target.value)}
              rows={2}
              required
              placeholder="Enter diagnosis..."
            />
          </div>

          <div>
            <Label htmlFor="treatment">Treatment Provided *</Label>
            <Textarea
              id="treatment"
              value={formData.treatment}
              onChange={(e) => handleInputChange("treatment", e.target.value)}
              rows={3}
              required
              placeholder="Describe the treatment provided..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={2}
              placeholder="Any additional notes or observations..."
            />
          </div>

          <div>
            <Label className="text-base font-semibold">X-ray Images (Optional)</Label>
            <p className="text-sm text-gray-600 mb-2">Upload any X-ray images taken during this appointment</p>
            <XrayImageUpload
              existingImages={xrayImages}
              onImagesChange={handleXrayImagesChange}
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700" 
              disabled={loading}
            >
              {loading ? "Completing..." : "Complete Appointment"}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentCompletionModalWithXrays;
