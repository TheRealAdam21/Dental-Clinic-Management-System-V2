import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, FileImage, Loader2, RotateCw, ScanLine, Stethoscope, Trash2, Wand2 } from "lucide-react";
import { captureRecordImage, pickRecordImages, rotateImageDataUrl } from "@/lib/cameraCapture";
import { recognizeTextFromImages } from "@/lib/ocrService";
import {
  parsePatientRecordText,
  type ParsedPatientRecord,
  type ParsedVisit,
} from "@/lib/recordParser";
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

const toFieldMap = (record: Record<string, string | string[]>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(", ") : String(value ?? ""),
    ])
  );

const splitList = (value: string | undefined): string[] =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const toMedicalPayload = (fields: Record<string, string>) => ({
  ...fields,
  allergies: splitList(fields.allergies),
  medical_conditions: splitList(fields.medical_conditions),
});

const PATIENT_FIELDS: Array<{
  key: string;
  label: string;
  type?: string;
  span?: boolean;
  required?: boolean;
}> = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "phone", label: "Phone", type: "tel", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "date_of_birth", label: "Date of Birth", type: "date" },
  { key: "age", label: "Age", type: "number" },
  { key: "gender", label: "Gender" },
  { key: "marital_status", label: "Marital Status" },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Address", span: true },
  { key: "emergency_contact_name", label: "Emergency Contact" },
  { key: "emergency_contact_phone", label: "Emergency Phone" },
  { key: "insurance_provider", label: "Insurance Provider" },
  { key: "insurance_policy_number", label: "Policy Number" },
];

const GENDER_OPTIONS = ["male", "female", "other"];
const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed", "separated"];

const MEDICAL_YES_NO_FIELDS = [
  { key: "in_good_health", label: "In good health?" },
  { key: "in_medical_treatment", label: "Under medical treatment?" },
  { key: "serious_illness", label: "Serious illness or surgery?" },
  { key: "hospitalized", label: "Ever hospitalized?" },
  { key: "taking_medication", label: "Taking medication?" },
  { key: "uses_tobacco", label: "Uses tobacco?" },
  { key: "uses_alcohol_drugs", label: "Uses alcohol or drugs?" },
  { key: "is_pregnant", label: "Pregnant?" },
  { key: "is_nursing", label: "Nursing?" },
  { key: "taking_birth_control", label: "Taking birth control?" },
];

const MEDICAL_TEXT_FIELDS = [
  { key: "physician_name", label: "Physician" },
  { key: "physician_specialty", label: "Specialty" },
  { key: "physician_phone", label: "Physician phone" },
  { key: "treatment_condition", label: "Condition under treatment" },
  { key: "illness_description", label: "Illness / operation" },
  { key: "hospitalization_details", label: "Hospitalization details" },
  { key: "medication_details", label: "Medication details" },
  { key: "bleeding_time", label: "Bleeding time" },
  { key: "blood_type", label: "Blood type" },
  { key: "blood_pressure", label: "Blood pressure" },
  { key: "other_allergy", label: "Other allergy" },
];

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
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null);
  const [showMedicalReview, setShowMedicalReview] = useState(false);

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
    setRotatingIndex(null);
    setShowMedicalReview(false);
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

  const handleRotate = async (index: number) => {
    setRotatingIndex(index);
    try {
      const rotated = await rotateImageDataUrl(images[index], 90);
      setImages((current) =>
        current.map((image, imageIndex) => (imageIndex === index ? rotated : image))
      );
    } finally {
      setRotatingIndex(null);
    }
  };

  const updatePatientField = (key: string, value: string) => {
    setPatientFields((current) => ({ ...current, [key]: value }));
  };

  const updateMedicalField = (key: string, value: string) => {
    setMedicalFields((current) => ({ ...current, [key]: value }));
  };

  const applyParsedResult = (parsed: ParsedPatientRecord, autoApply: boolean) => {
    const patientFieldMap = toFieldMap(parsed.patient);

    if (patientFieldMap.date_of_birth && !patientFieldMap.age) {
      const dob = new Date(patientFieldMap.date_of_birth);
      if (!Number.isNaN(dob.getTime())) {
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        if (age >= 0) patientFieldMap.age = String(age);
      }
    }

    const medicalFieldMap = toFieldMap(parsed.medicalHistory);
    const parsedVisits =
      parsed.visits.length > 0 ? parsed.visits : mode === "visits" ? [emptyVisit()] : [];

    setPatientFields(patientFieldMap);
    setMedicalFields(medicalFieldMap);
    setVisits(parsedVisits);
    setRawText(parsed.rawText);
    setShowMedicalReview(Object.values(medicalFieldMap).some((value) => value.trim()));

    const hasPatientData = Boolean(
      patientFieldMap.first_name ||
        patientFieldMap.last_name ||
        patientFieldMap.phone ||
        patientFieldMap.date_of_birth
    );

    if (autoApply && onApplyToForm && mode === "patient" && hasPatientData) {
      onApplyToForm({
        patient: patientFieldMap,
        medicalHistory: toMedicalPayload(medicalFieldMap),
        visits: parsedVisits.filter((visit) => visit.visit_date || visit.treatment),
      });
    }

    return { hasPatientData, parsedVisits };
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
      const { hasPatientData, parsedVisits } = applyParsedResult(parsed, true);
      setStep("review");

      if (!hasPatientData && parsedVisits.length === 0) {
        toast.warning(
          "Could not confidently read the record. Fix the scanned text or edit the fields manually."
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

  const handleReextract = () => {
    if (!rawText.trim()) {
      toast.error("The scanned text is empty. Scan the record again.");
      return;
    }

    applyParsedResult(parsePatientRecordText(rawText), false);
    toast.success("Fields re-extracted from the edited text.");
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
      medicalHistory: toMedicalPayload(medicalFields),
      visits: visits.filter((visit) => visit.visit_date || visit.treatment),
    }),
    [patientFields, medicalFields, visits]
  );

  const hasMedicalData = Object.values(medicalFields).some((value) => (value ?? "").trim());
  const missingRequired =
    mode === "patient" &&
    (!patientFields.first_name?.trim() ||
      !patientFields.last_name?.trim() ||
      !patientFields.phone?.trim());

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
            treatment_cost: visit.treatment_cost,
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
          allergies: splitList(medicalFields.allergies),
          medical_conditions: splitList(medicalFields.medical_conditions),
        });
      }

      const validVisits = visits.filter((visit) => visit.visit_date && visit.treatment);
      for (const visit of validVisits) {
        await dataService.addVisit({
          patient_id: patient.id,
          visit_date: visit.visit_date,
          diagnosis: visit.diagnosis || undefined,
          treatment: visit.treatment,
          treatment_cost: visit.treatment_cost,
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
            <ScanLine className="h-5 w-5 text-primary" />
            {mode === "visits" ? "Scan Visit History" : "Scan Physical Patient Record"}
          </DialogTitle>
          <DialogDescription>
            Photograph printed or handwritten records. Flatten the page, fill the frame, and avoid
            shadows; sideways photos can be rotated before scanning. Everything is editable before
            saving.
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
              {images.length > 0 && (
                <Badge variant="secondary" className="self-center">
                  {images.length} page{images.length > 1 ? "s" : ""} ready
                </Badge>
              )}
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
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-7 w-7"
                      title="Rotate page 90°"
                      onClick={() => handleRotate(index)}
                      disabled={rotatingIndex === index}
                    >
                      {rotatingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCw className="h-4 w-4" />
                      )}
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
                {PATIENT_FIELDS.map((field) => {
                  const value = patientFields[field.key] ?? "";
                  const isSelectField = field.key === "gender" || field.key === "marital_status";
                  const options =
                    field.key === "gender" ? GENDER_OPTIONS : MARITAL_OPTIONS;

                  return (
                    <div key={field.key} className={field.span ? "md:col-span-2" : ""}>
                      <Label htmlFor={`scan-${field.key}`}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </Label>

                      {isSelectField ? (
                        <Select
                          value={value || undefined}
                          onValueChange={(next) => updatePatientField(field.key, next)}
                        >
                          <SelectTrigger id={`scan-${field.key}`}>
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.span ? (
                        <Textarea
                          id={`scan-${field.key}`}
                          value={value}
                          onChange={(event) => updatePatientField(field.key, event.target.value)}
                          rows={2}
                        />
                      ) : (
                        <Input
                          id={`scan-${field.key}`}
                          type={field.type ?? "text"}
                          value={value}
                          onChange={(event) => updatePatientField(field.key, event.target.value)}
                        />
                      )}

                      {field.required && !value.trim() && (
                        <p className="text-xs text-destructive mt-1">Needed before saving</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {mode === "patient" && hasMedicalData && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Medical history from scan
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowMedicalReview((current) => !current)}
                  >
                    {showMedicalReview ? "Hide" : "Review"}
                  </Button>
                </div>

                {showMedicalReview && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {MEDICAL_YES_NO_FIELDS.map((field) => (
                        <div key={field.key}>
                          <Label htmlFor={`scan-${field.key}`}>{field.label}</Label>
                          <Select
                            value={medicalFields[field.key] || "unknown"}
                            onValueChange={(next) =>
                              updateMedicalField(field.key, next === "unknown" ? "" : next)
                            }
                          >
                            <SelectTrigger id={`scan-${field.key}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unknown">Not answered</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    {MEDICAL_TEXT_FIELDS.filter((field) => (medicalFields[field.key] ?? "").trim())
                      .map((field) => (
                        <div key={field.key}>
                          <Label htmlFor={`scan-${field.key}`}>{field.label}</Label>
                          <Input
                            id={`scan-${field.key}`}
                            value={medicalFields[field.key] ?? ""}
                            onChange={(event) => updateMedicalField(field.key, event.target.value)}
                          />
                        </div>
                      ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="scan-allergies">Allergies (comma separated)</Label>
                        <Input
                          id="scan-allergies"
                          value={medicalFields.allergies ?? ""}
                          onChange={(event) => updateMedicalField("allergies", event.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scan-conditions">Medical conditions (comma separated)</Label>
                        <Input
                          id="scan-conditions"
                          value={medicalFields.medical_conditions ?? ""}
                          onChange={(event) =>
                            updateMedicalField("medical_conditions", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="scan-raw-text">Scanned text</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleReextract}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Re-extract fields
                </Button>
              </div>
              <Textarea
                id="scan-raw-text"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Correcting a misread word here and pressing &quot;Re-extract fields&quot; is usually
                faster than retyping every field.
              </p>
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
              <Button type="button" onClick={handleSave} disabled={saving || missingRequired}>
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
