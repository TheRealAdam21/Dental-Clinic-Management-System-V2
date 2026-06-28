
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataService } from "@/services/dataService";
import { User, Phone, Mail, Calendar, Eye, Image as ImageIcon, FileBadge, Trash2 } from "lucide-react";
import VisitTracker from "./VisitTracker";
import PatientXrayManager from "./PatientXrayManager";
import DentalCertificateGenerator from "./DentalCertificateGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const dataService = new DataService();

interface PatientListProps {
  showVisits?: boolean;
}

const PatientList = ({ showVisits = false }: PatientListProps) => {
  const { userRole } = useAuth();
  const canDeletePatients = userRole === "admin" || userRole === "dentist";
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'visits' | 'xrays' | 'certificate'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await dataService.getPatients();
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
    setLoading(false);
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  );

  const handleDeletePatient = async (patient: any) => {
    if (!canDeletePatients) return;
    setPatientToDelete(patient);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;
    if (deleteConfirmText.trim() !== "DELETE") {
      toast.error('Type DELETE to confirm removal.');
      return;
    }
    try {
      await dataService.deletePatient(patientToDelete.id);
      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      toast.success("Patient deleted successfully.");
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Failed to delete patient.");
    }
  };

  if (loading) {
    return <div className="text-center">Loading patients...</div>;
  }

  if (selectedPatient && viewMode === 'visits') {
    return (
      <div>
        <Button 
          onClick={() => {
            setSelectedPatient(null);
            setViewMode('list');
          }} 
          className="mb-4"
          variant="outline"
        >
          ← Back to Patient List
        </Button>
        <VisitTracker patient={selectedPatient} />
      </div>
    );
  }

  if (selectedPatient && viewMode === 'xrays') {
    return (
      <div>
        <Button 
          onClick={() => {
            setSelectedPatient(null);
            setViewMode('list');
          }} 
          className="mb-4"
          variant="outline"
        >
          ← Back to Patient List
        </Button>
        <PatientXrayManager patient={selectedPatient} />
      </div>
    );
  }

  if (selectedPatient && viewMode === 'certificate') {
    return (
      <div>
        <Button
          onClick={() => {
            setSelectedPatient(null);
            setViewMode('list');
          }}
          className="mb-4"
          variant="outline"
        >
          ← Back to Patient List
        </Button>
        <DentalCertificateGenerator patient={selectedPatient} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {showVisits ? "Patient Records" : "Registered Patients"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search patients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-4">
            {filteredPatients.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchTerm ? "No patients found matching your search" : "No patients registered yet"}
              </p>
            ) : (
              filteredPatients.map((patient) => (
                <Card key={patient.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                          <User className="h-4 w-4" />
                          {patient.first_name} {patient.last_name}
                          {patient.gender && (
                            <Badge variant="outline">{patient.gender}</Badge>
                          )}
                          {patient.xray_images && patient.xray_images.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              {patient.xray_images.length} X-ray{patient.xray_images.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {patient.email}
                            </div>
                          )}
                          {patient.date_of_birth && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(patient.date_of_birth).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {patient.insurance_provider && (
                          <div className="mt-2 text-sm">
                            <Badge className="bg-green-100 text-green-800">
                              Insurance: {patient.insurance_provider}
                            </Badge>
                          </div>
                        )}

                        {patient.medical_history && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <strong>Medical History:</strong> {patient.medical_history}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setViewMode('xrays');
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          X-rays
                        </Button>
                        {showVisits && (
                          <Button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setViewMode('certificate');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <FileBadge className="h-4 w-4 mr-1" />
                            Certificate
                          </Button>
                        )}
                        {showVisits && (
                          <Button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setViewMode('visits');
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Records
                          </Button>
                        )}
                        {canDeletePatients && (
                          <Button
                            onClick={() => handleDeletePatient(patient)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Patient
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Patient Deletion</DialogTitle>
            <DialogDescription>
              This will permanently remove patient{" "}
              <strong>
                {patientToDelete?.first_name} {patientToDelete?.last_name}
              </strong>{" "}
              and related records. Type <strong>DELETE</strong> to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Type "DELETE"'
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPatientToDelete(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeletePatient}
              disabled={deleteConfirmText.trim() !== "DELETE"}
            >
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientList;
