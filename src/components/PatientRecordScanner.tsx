import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, FileImage, Loader2, ScanLine, Trash2 } from "lucide-react";
import { captureRecordImage, pickRecordImages } from "@/lib/cameraCapture";
import { recognizeTextFromImages } from "@/lib/ocrService";
import { parsePatientRecordText, type ParsedVisit } from "@/lib/recordParser";
import { DataService } from "@/services/dataService";

const dataService = new DataService();

type ScannerMode = "patient" | "visits";

interface PatientRecordScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: ScannerMode;
  patientId?: string;
  onApplyToForm?: (data: {
    patient: Record<string, string | string[]>;
    medicalHistory: Record<string, string | string[]>;
    visits: ParsedVisit[];
  }) => void;
  onSaved?: () => void;
}

const emptyVisit = (): ParsedVisit => ({
  visit_date: "",
  diagnosis: "",
  treatment: "",
  treatment_cost: null,
  notes: "",
});

const PatientRecordScanner = ({
  open,
  onOpenChange,
  mode = "patient",
  patientId,
  onApplyToForm,
  onSaved,
}: PatientRecordScannerProps) => {
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [images, setImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [rawText, setRawText] = useState("");
  const [patientFields, setPatientFields] = useState<Record<string, string>>({});
  const [medicalFields, setMedicalFields] = useState<Record<string, string>>({});
  const [visits, setVisits] = useState<ParsedVisit[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("capture");
    setImages([]);
    setScanning(false);
    setProgress(0);
    setProgressLabel("");
    setRawText("");
    setPatientFields({});
    setMedicalFields({});
    setVisits([]);
    setSaving(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const addImage = (image: string) => {
    setImages((current) => [...current, image]);
  };

  const handleCapture = async () => {
    const image = await captureRecordImage();
    if (image) addImage(image);
  };

  const handlePickImages = async () => {
    const picked = await pickRecordImages();
    if (picked.length > 0) {
      setImages((current) => [...current, ...picked]);
    }
  };

  const handleScan = async () => {
    if (images.length === 0) {
      toast.error("Add at least one photo of the patient record first.");
      return;
    }

    setScanning(true);
    setProgress(0);
    setProgressLabel("Starting OCR...");

    try {
      const text = await recognizeTextFromImages(images, (status) => {
        setProgress(status.progress);
        setProgressLabel(status.status);
      });

      const parsed = parsePatientRecordText(text);
      const patientFieldMap = Object.fromEntries(
        Object.entries(parsed.patient).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(", ") : String(value ?? ""),
        ])
      );

      if (patientFieldMap.date_of_birth && !patientFieldMap.age) {
        const dob = new Date(patientFieldMap.date_of_birth);
        if (!Number.isNaN(dob.getTime())) {
          const age = Math.floor(
            (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );
          if (age >= 0) patientFieldMap.age = String(age);
        }
      }

      const medicalFieldMap = Object.fromEntries(
        Object.entries(parsed.medicalHistory).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(", ") : String(value ?? ""),
        ])
      );
      const parsedVisits =
        parsed.visits.length > 0 ? parsed.visits : mode === "visits" ? [emptyVisit()] : [];

      setRawText(parsed.rawText);
      setPatientFields(patientFieldMap);
      setMedicalFields(medicalFieldMap);
      setVisits(parsedVisits);
      setStep("review");

      const hasPatientData = Boolean(
        patientFieldMap.first_name ||
          patientFieldMap.last_name ||
          patientFieldMap.phone ||
          patientFieldMap.date_of_birth
      );

      if (onApplyToForm && mode === "patient" && hasPatientData) {
        onApplyToForm({
          patient: patientFieldMap,
          medicalHistory: {
            ...medicalFieldMap,
            allergies: medicalFieldMap.allergies
              ? medicalFieldMap.allergies.split(",").map((item) => item.trim()).filter(Boolean)
              : [],
            medical_conditions: medicalFieldMap.medical_conditions
              ? medicalFieldMap.medical_conditions.split(",").map((item) => item.trim()).filter(Boolean)
              : [],
          },
          visits: parsedVisits.filter((visit) => visit.visit_date || visit.treatment),
        });
      }

      if (!hasPatientData && parsed.visits.length === 0) {
        toast.warning(
          "Could not confidently read the record. Review and edit the fields manually."
        );
      } else if (onApplyToForm && mode === "patient" && hasPatientData) {
        toast.success("Record scanned and applied to the form. Review the details below.");
      } else {
        toast.success("Record scanned. Review the extracted details before saving.");
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown OCR error";
      if (/image|decode|format/i.test(message)) {
        toast.error("Could not read that image. Use JPG or PNG, or retake the photo.");
      } else if (/worker|wasm|tesseract|network|fetch/i.test(message)) {
        toast.error("OCR engine failed to load. Refresh the page and try again.");
      } else {
        toast.error(`Failed to scan the record: ${message}`);
      }
    } finally {
      setScanning(false);
    }
  };

  const updateVisit = (index: number, field: keyof ParsedVisit, value: string) => {
    setVisits((current) =>
      current.map((visit, visitIndex) => {
        if (visitIndex !== index) return visit;
        if (field === "treatment_cost") {
          const amount = value ? Number(value) : null;
          return { ...visit, treatment_cost: Number.isFinite(amount) ? amount : null };
        }
        return { ...visit, [field]: value };
      })
    );
  };

  const removeVisit = (index: number) => {
    setVisits((current) => current.filter((_, visitIndex) => visitIndex !== index));
  };

  const parsedForApply = useMemo(
    () => ({
      patient: patientFields,
      medicalHistory: {
        ...medicalFields,
        allergies: medicalFields.allergies
          ? medicalFields.allergies.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
        medical_conditions: medicalFields.medical_conditions
          ? medicalFields.medical_conditions.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
      },
      visits: visits.filter((visit) => visit.visit_date || visit.treatment),
    }),
    [patientFields, medicalFields, visits]
  );

  const handleApplyToForm = () => {
    onApplyToForm?.(parsedForApply);
    toast.success("Scanned details applied to the form.");
    handleClose(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "visits" && patientId) {
        const validVisits = visits.filter((visit) => visit.visit_date && visit.treatment);
        if (validVisits.length === 0) {
          toast.error("Add at least one visit with a date and treatment.");
          return;
        }

        for (const visit of validVisits) {
          await dataService.addVisit({
            patient_id: patientId,
            visit_date: visit.visit_date,
            diagnosis: visit.diagnosis || undefined,
            treatment: visit.treatment,
            treatment_provided: visit.treatment,
            treatment_cost: visit.treatment_cost,
            amount_charged: visit.treatment_cost ?? undefined,
            notes: visit.notes || undefined,
          });
        }

        toast.success(`Imported ${validVisits.length} visit record(s).`);
        onSaved?.();
        handleClose(false);
        return;
      }

      if (!patientFields.first_name?.trim() || !patientFields.last_name?.trim()) {
        toast.error("First and last name are required before saving.");
        return;
      }

      if (!patientFields.phone?.trim() || patientFields.phone.trim().length < 10) {
        toast.error("A valid phone number is required before saving.");
        return;
      }

      const patient = await dataService.addPatient({
        first_name: patientFields.first_name.trim(),
        last_name: patientFields.last_name.trim(),
        email: patientFields.email?.trim() || "",
        phone: patientFields.phone.trim(),
        date_of_birth: patientFields.date_of_birth || "",
        age: patientFields.age ? Number(patientFields.age) : null,
        occupation: patientFields.occupation || "",
        marital_status: patientFields.marital_status || "",
        address: patientFields.address || "",
        emergency_contact_name: patientFields.emergency_contact_name || "",
        emergency_contact_phone: patientFields.emergency_contact_phone || "",
        insurance_provider: patientFields.insurance_provider || "",
        insurance_policy_number: patientFields.insurance_policy_number || "",
        gender: patientFields.gender || "",
      });

      const hasMedicalHistory = Object.values(medicalFields).some((value) => value.trim());
      if (hasMedicalHistory) {
        await dataService.addMedicalHistory({
          patient_id: patient.id,
          physician_name: medicalFields.physician_name || undefined,
          physician_specialty: medicalFields.physician_specialty || undefined,
          physician_address: medicalFields.physician_address || undefined,
          physician_phone: medicalFields.physician_phone || undefined,
          in_good_health: medicalFields.in_good_health || undefined,
          in_medical_treatment: medicalFields.in_medical_treatment || undefined,
          treatment_condition: medicalFields.treatment_condition || undefined,
          serious_illness: medicalFields.serious_illness || undefined,
          illness_description: medicalFields.illness_description || undefined,
          hospitalized: medicalFields.hospitalized || undefined,
          hospitalization_details: medicalFields.hospitalization_details || undefined,
          taking_medication: medicalFields.taking_medication || undefined,
          medication_details: medicalFields.medication_details || undefined,
          uses_tobacco: medicalFields.uses_tobacco || undefined,
          uses_alcohol_drugs: medicalFields.uses_alcohol_drugs || undefined,
          bleeding_time: medicalFields.bleeding_time || undefined,
          blood_type: medicalFields.blood_type || undefined,
          blood_pressure: medicalFields.blood_pressure || undefined,
          is_pregnant: medicalFields.is_pregnant || undefined,
          is_nursing: medicalFields.is_nursing || undefined,
          taking_birth_control: medicalFields.taking_birth_control || undefined,
          other_allergy: medicalFields.other_allergy || undefined,
          allergies: medicalFields.allergies
            ? medicalFields.allergies.split(",").map((item) => item.trim()).filter(Boolean)
            : [],
          medical_conditions: medicalFields.medical_conditions
            ? medicalFields.medical_conditions.split(",").map((item) => item.trim()).filter(Boolean)
            : [],
        });
      }

      const validVisits = visits.filter((visit) => visit.visit_date && visit.treatment);
      for (const visit of validVisits) {
        await dataService.addVisit({
          patient_id: patient.id,
          visit_date: visit.visit_date,
          diagnosis: visit.diagnosis || undefined,
          treatment: visit.treatment,
          treatment_provided: visit.treatment,
          treatment_cost: visit.treatment_cost,
          amount_charged: visit.treatment_cost ?? undefined,
          notes: visit.notes || undefined,
        });
      }

      toast.success(
        `Patient saved${validVisits.length > 0 ? ` with ${validVisits.length} visit record(s)` : ""}.`
      );
      onSaved?.();
      handleClose(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save scanned record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-600" />
            {mode === "visits" ? "Scan Visit History" : "Scan Physical Patient Record"}
          </DialogTitle>
          <DialogDescription>
            Take clear photos of printed or handwritten records. OCR works best with good lighting,
            flat pages, and printed text. Review everything before saving.
          </DialogDescription>
        </DialogHeader>

        {step === "capture" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleCapture} disabled={scanning}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button type="button" variant="outline" onClick={handlePickImages} disabled={scanning}>
                <FileImage className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={`${image.slice(0, 24)}-${index}`} className="relative border rounded-lg overflow-hidden">
                    <img src={image} alt={`Scanned page ${index + 1}`} className="h-36 w-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Badge className="absolute bottom-2 left-2">Page {index + 1}</Badge>
                  </div>
                ))}
              </div>
            )}

            {scanning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progressLabel}
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {mode === "patient" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={patientFields.first_name ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={patientFields.last_name ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, last_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={patientFields.phone ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={patientFields.email ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={patientFields.date_of_birth ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, date_of_birth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    value={patientFields.age ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, age: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={patientFields.address ?? ""}
                    onChange={(e) => setPatientFields((current) => ({ ...current, address: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Visit Records</h3>
                {(visits.length > 0 || mode === "visits") && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setVisits((current) => [...current, emptyVisit()])}>
                    Add Visit
                  </Button>
                )}
              </div>

              {visits.length === 0 && mode === "patient" ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                  No visit history was detected in this scan. Patient details were extracted above — use
                  &quot;Apply to Form&quot; or close and check the registration form.
                </p>
              ) : (
                visits.map((visit, index) => (
                <div key={`visit-${index}`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Visit {index + 1}</Badge>
                    {visits.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeVisit(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Visit Date</Label>
                      <Input
                        type="date"
                        value={visit.visit_date}
                        onChange={(e) => updateVisit(index, "visit_date", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Cost (PHP)</Label>
                      <Input
                        type="number"
                        value={visit.treatment_cost ?? ""}
                        onChange={(e) => updateVisit(index, "treatment_cost", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Diagnosis</Label>
                      <Input
                        value={visit.diagnosis}
                        onChange={(e) => updateVisit(index, "diagnosis", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Treatment</Label>
                      <Textarea
                        value={visit.treatment}
                        onChange={(e) => updateVisit(index, "treatment", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={visit.notes}
                        onChange={(e) => updateVisit(index, "notes", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>

            <div>
              <Label>Raw OCR Text</Label>
              <Textarea value={rawText} readOnly rows={6} className="font-mono text-xs" />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "capture" ? (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleScan} disabled={scanning || images.length === 0}>
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan Record
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("capture")}>
                Back
              </Button>
              {onApplyToForm && mode === "patient" && (
                <Button type="button" variant="secondary" onClick={handleApplyToForm}>
                  Apply to Form
                </Button>
              )}
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : mode === "visits" ? "Import Visits" : "Save Patient"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientRecordScanner;
