
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image as ImageIcon, Plus } from "lucide-react";
import XrayImageUpload from "./XrayImageUpload";
import { dataService } from "@/services/dataService";
import type { Patient } from "@/types";

interface PatientXrayManagerProps {
  patient: Patient;
}

const PatientXrayManager = ({ patient }: PatientXrayManagerProps) => {
  const [patientXrays, setPatientXrays] = useState<string[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    fetchPatientXrays();
  }, [patient.id]);

  const fetchPatientXrays = async () => {
    const fresh = await dataService.getPatientById(patient.id);
    setPatientXrays(fresh?.xray_images || []);
  };

  const handleXrayImagesChange = async (images: string[]) => {
    setPatientXrays(images);
    
    try {
      await dataService.updatePatient(patient.id, { xray_images: images });
      toast.success("Patient X-rays updated successfully!");
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Error updating patient X-rays:', error);
      toast.error("Failed to update patient X-rays");
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            X-ray Images for {patient.first_name} {patient.last_name}
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Manage X-rays
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage X-ray Images - {patient.first_name} {patient.last_name}</DialogTitle>
              </DialogHeader>
              <XrayImageUpload
                patientId={patient.id}
                existingImages={patientXrays}
                onImagesChange={handleXrayImagesChange}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {patientXrays.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No X-ray images uploaded yet</p>
        ) : (
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">
              <ImageIcon className="h-3 w-3 mr-1" />
              {patientXrays.length} X-ray image{patientXrays.length > 1 ? 's' : ''} on file
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>X-ray Images - {patient.first_name} {patient.last_name}</DialogTitle>
                </DialogHeader>
                <XrayImageUpload
                  patientId={patient.id}
                  existingImages={patientXrays}
                  onImagesChange={() => {}} // Read-only mode
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientXrayManager;
