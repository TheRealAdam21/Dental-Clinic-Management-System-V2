
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Calendar, DollarSign, History, Image as ImageIcon } from "lucide-react";
import MedicalHistoryDisplay from "./MedicalHistoryDisplay";
import XrayImageUpload from "./XrayImageUpload";

interface VisitTrackerProps {
  patient: any;
}

const VisitTracker = ({ patient }: VisitTrackerProps) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    visit_date: "",
    diagnosis: "",
    treatment: "",
    treatment_cost: "",
    notes: ""
  });
  const [xrayImages, setXrayImages] = useState<string[]>([]);

  useEffect(() => {
    fetchVisits();
  }, [patient.id]);

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('patient_id', patient.id)
      .order('visit_date', { ascending: false });

    if (error) {
      console.error('Error fetching visits:', error);
    } else {
      setVisits(data || []);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleXrayImagesChange = (images: string[]) => {
    setXrayImages(images);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('visits')
        .insert([{
          ...formData,
          patient_id: patient.id,
          treatment_cost: formData.treatment_cost ? parseFloat(formData.treatment_cost) : null,
          xray_images: xrayImages.length > 0 ? xrayImages : null
        }]);

      if (error) throw error;

      toast.success("Visit record added successfully!");
      setFormData({
        visit_date: "",
        diagnosis: "",
        treatment: "",
        treatment_cost: "",
        notes: ""
      });
      setXrayImages([]);
      setShowAddForm(false);
      fetchVisits();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to add visit record. Please try again.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Visit Records for {patient.first_name} {patient.last_name}
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <History className="h-4 w-4 mr-1" />
                    Medical History
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Medical History - {patient.first_name} {patient.last_name}</DialogTitle>
                  </DialogHeader>
                  <MedicalHistoryDisplay patientId={patient.id} />
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Visit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-6 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Add New Visit Record</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="visit_date">Visit Date *</Label>
                      <Input
                        id="visit_date"
                        type="date"
                        value={formData.visit_date}
                        onChange={(e) => handleInputChange("visit_date", e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="treatment_cost">Treatment Cost (₱)</Label>
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

                  <div>
                    <Label htmlFor="diagnosis">Diagnosis *</Label>
                    <Textarea
                      id="diagnosis"
                      value={formData.diagnosis}
                      onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                      rows={2}
                      required
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <XrayImageUpload
                    existingImages={xrayImages}
                    onImagesChange={handleXrayImagesChange}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Save Visit Record
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {visits.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No visit records found</p>
            ) : (
              visits.map((visit) => (
                <Card key={visit.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {visit.treatment_cost && (
                          <Badge className="bg-green-100 text-green-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {formatCurrency(visit.treatment_cost)}
                          </Badge>
                        )}
                        {visit.xray_images && visit.xray_images.length > 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {visit.xray_images.length} X-ray{visit.xray_images.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Diagnosis:</h4>
                        <p className="text-sm">{visit.diagnosis}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Treatment:</h4>
                        <p className="text-sm">{visit.treatment}</p>
                      </div>

                      {visit.notes && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700">Notes:</h4>
                          <p className="text-sm text-gray-600">{visit.notes}</p>
                        </div>
                      )}

                      {visit.xray_images && visit.xray_images.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">X-ray Images:</h4>
                          <XrayImageUpload
                            visitId={visit.id}
                            existingImages={visit.xray_images}
                            onImagesChange={() => {}} // Read-only mode for existing visits
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitTracker;
