import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";
import { DataService } from "@/services/dataService";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { patientSchema, medicalHistorySchema } from "@/lib/validationSchemas";
import PatientRecordScanner from "@/components/PatientRecordScanner";
import type { ParsedVisit } from "@/lib/recordParser";

const dataService = new DataService();

const PatientForm = () => {
  const { isAuthorized, loading: authLoading } = useAuthGuard();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    age: "",
    occupation: "",
    marital_status: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    insurance_provider: "",
    insurance_policy_number: "",
    gender: "",
    // Medical History Fields
    physician_name: "",
    physician_specialty: "",
    physician_address: "",
    physician_phone: "",
    in_good_health: "",
    in_medical_treatment: "",
    treatment_condition: "",
    serious_illness: "",
    illness_description: "",
    hospitalized: "",
    hospitalization_details: "",
    taking_medication: "",
    medication_details: "",
    uses_tobacco: "",
    uses_alcohol_drugs: "",
    allergies: [] as string[],
    other_allergy: "",
    bleeding_time: "",
    is_pregnant: "",
    is_nursing: "",
    taking_birth_control: "",
    blood_type: "",
    blood_pressure: "",
    medical_conditions: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeMedicalHistory, setIncludeMedicalHistory] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedVisits, setScannedVisits] = useState<ParsedVisit[]>([]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const handleScanApply = (data: {
    patient: Record<string, string | string[]>;
    medicalHistory: Record<string, string | string[]>;
    visits: ParsedVisit[];
  }) => {
    setFormData((prev) => ({
      ...prev,
      first_name: String(data.patient.first_name ?? prev.first_name),
      last_name: String(data.patient.last_name ?? prev.last_name),
      email: String(data.patient.email ?? prev.email),
      phone: String(data.patient.phone ?? prev.phone),
      date_of_birth: String(data.patient.date_of_birth ?? prev.date_of_birth),
      age: String(data.patient.age ?? prev.age),
      occupation: String(data.patient.occupation ?? prev.occupation),
      marital_status: String(data.patient.marital_status ?? prev.marital_status),
      address: String(data.patient.address ?? prev.address),
      emergency_contact_name: String(data.patient.emergency_contact_name ?? prev.emergency_contact_name),
      emergency_contact_phone: String(data.patient.emergency_contact_phone ?? prev.emergency_contact_phone),
      insurance_provider: String(data.patient.insurance_provider ?? prev.insurance_provider),
      insurance_policy_number: String(data.patient.insurance_policy_number ?? prev.insurance_policy_number),
      gender: String(data.patient.gender ?? prev.gender),
      physician_name: String(data.medicalHistory.physician_name ?? prev.physician_name),
      physician_specialty: String(data.medicalHistory.physician_specialty ?? prev.physician_specialty),
      physician_address: String(data.medicalHistory.physician_address ?? prev.physician_address),
      physician_phone: String(data.medicalHistory.physician_phone ?? prev.physician_phone),
      in_good_health: String(data.medicalHistory.in_good_health ?? prev.in_good_health),
      in_medical_treatment: String(data.medicalHistory.in_medical_treatment ?? prev.in_medical_treatment),
      treatment_condition: String(data.medicalHistory.treatment_condition ?? prev.treatment_condition),
      serious_illness: String(data.medicalHistory.serious_illness ?? prev.serious_illness),
      illness_description: String(data.medicalHistory.illness_description ?? prev.illness_description),
      hospitalized: String(data.medicalHistory.hospitalized ?? prev.hospitalized),
      hospitalization_details: String(data.medicalHistory.hospitalization_details ?? prev.hospitalization_details),
      taking_medication: String(data.medicalHistory.taking_medication ?? prev.taking_medication),
      medication_details: String(data.medicalHistory.medication_details ?? prev.medication_details),
      uses_tobacco: String(data.medicalHistory.uses_tobacco ?? prev.uses_tobacco),
      uses_alcohol_drugs: String(data.medicalHistory.uses_alcohol_drugs ?? prev.uses_alcohol_drugs),
      allergies: Array.isArray(data.medicalHistory.allergies)
        ? data.medicalHistory.allergies
        : prev.allergies,
      other_allergy: String(data.medicalHistory.other_allergy ?? prev.other_allergy),
      bleeding_time: String(data.medicalHistory.bleeding_time ?? prev.bleeding_time),
      is_pregnant: String(data.medicalHistory.is_pregnant ?? prev.is_pregnant),
      is_nursing: String(data.medicalHistory.is_nursing ?? prev.is_nursing),
      taking_birth_control: String(data.medicalHistory.taking_birth_control ?? prev.taking_birth_control),
      blood_type: String(data.medicalHistory.blood_type ?? prev.blood_type),
      blood_pressure: String(data.medicalHistory.blood_pressure ?? prev.blood_pressure),
      medical_conditions: Array.isArray(data.medicalHistory.medical_conditions)
        ? data.medicalHistory.medical_conditions
        : prev.medical_conditions,
    }));

    const hasMedicalHistory = Object.entries(data.medicalHistory).some(([key, value]) => {
      if (key === "allergies" || key === "medical_conditions") {
        return Array.isArray(value) && value.length > 0;
      }
      return String(value ?? "").trim().length > 0;
    });
    if (hasMedicalHistory) {
      setIncludeMedicalHistory(true);
    }
    setScannedVisits(data.visits);
  };

  const allergyOptions = [
    "Local Anesthetic (ex. Lidocaine)",
    "Penicillin, Antibiotics",
    "Sulfa drugs",
    "Aspirin",
    "Latex"
  ];

  const medicalConditions = [
    "High Blood Pressure", "Low Blood Pressure", "Epilepsy / Convulsions", "AIDS or HIV Infection",
    "Sexually Transmitted Disease", "Stomach Troubles / Ulcers", "Fainting Seizures", "Rapid Weight Loss",
    "Recent Weight Loss", "Joint Replacement / Implant", "Heart Attack", "Thyroid Problem",
    "Heart Disease", "Heart Murmur", "Hepatitis / Liver Disease", "Rheumatic Fever",
    "Hay fever / Allergies", "Respiratory Problems", "Hepatitis / Jaundice", "Tuberculosis",
    "Swollen ankles", "Kidney Disease", "Diabetes", "Chest pain", "Stroke", "Cancer / Tumors",
    "Anemia", "Angina", "Asthma", "Emphysema", "Bleeding Problems", "Blood diseases",
    "Head injuries", "Arthritis / Rheumatism"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthorized) {
      toast.error("Unauthorized access. Please log in as a dentist.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Validate patient data
      const patientData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        age: formData.age ? parseInt(formData.age) : null,
        occupation: formData.occupation,
        marital_status: formData.marital_status,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        insurance_provider: formData.insurance_provider,
        insurance_policy_number: formData.insurance_policy_number,
        gender: formData.gender
      };

      // Validate using schema
      const validatedPatientData = patientSchema.parse(patientData);

      const patientResult = await dataService.addPatient(patientData);

      // Only insert medical history if the user chose to include it
      if (includeMedicalHistory) {
        const medicalHistoryData = {
          patient_id: patientResult.id,
          physician_name: formData.physician_name,
          physician_specialty: formData.physician_specialty,
          physician_address: formData.physician_address,
          physician_phone: formData.physician_phone,
          in_good_health: formData.in_good_health,
          in_medical_treatment: formData.in_medical_treatment,
          treatment_condition: formData.treatment_condition,
          serious_illness: formData.serious_illness,
          illness_description: formData.illness_description,
          hospitalized: formData.hospitalized,
          hospitalization_details: formData.hospitalization_details,
          taking_medication: formData.taking_medication,
          medication_details: formData.medication_details,
          uses_tobacco: formData.uses_tobacco,
          uses_alcohol_drugs: formData.uses_alcohol_drugs,
          allergies: formData.allergies,
          other_allergy: formData.other_allergy,
          bleeding_time: formData.bleeding_time,
          is_pregnant: formData.is_pregnant,
          is_nursing: formData.is_nursing,
          taking_birth_control: formData.taking_birth_control,
          blood_type: formData.blood_type,
          blood_pressure: formData.blood_pressure,
          medical_conditions: formData.medical_conditions
        };

        // Validate medical history data only if including it
        if (medicalHistorySchema) {
          const validatedMedicalData = medicalHistorySchema.parse(medicalHistoryData);
        }

        await dataService.addMedicalHistory(medicalHistoryData);
      }

      const validScannedVisits = scannedVisits.filter(
        (visit) => visit.visit_date && visit.treatment
      );
      for (const visit of validScannedVisits) {
        await dataService.addVisit({
          patient_id: patientResult.id,
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
        validScannedVisits.length > 0
          ? `Patient registered with ${validScannedVisits.length} imported visit record(s)!`
          : "Patient registered successfully!"
      );
      
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        age: "",
        occupation: "",
        marital_status: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        insurance_provider: "",
        insurance_policy_number: "",
        gender: "",
        physician_name: "",
        physician_specialty: "",
        physician_address: "",
        physician_phone: "",
        in_good_health: "",
        in_medical_treatment: "",
        treatment_condition: "",
        serious_illness: "",
        illness_description: "",
        hospitalized: "",
        hospitalization_details: "",
        taking_medication: "",
        medication_details: "",
        uses_tobacco: "",
        uses_alcohol_drugs: "",
        allergies: [],
        other_allergy: "",
        bleeding_time: "",
        is_pregnant: "",
        is_nursing: "",
        taking_birth_control: "",
        blood_type: "",
        blood_pressure: "",
        medical_conditions: []
      });
      setIncludeMedicalHistory(false);
      setScannedVisits([]);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const fieldErrors = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        toast.error(`Validation error: ${fieldErrors}`);
      } else if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        toast.error("Permission denied. Please ensure you're logged in as a dentist.");
      } else {
        toast.error("Failed to register patient. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Register New Patient</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Fill out the form manually or scan an existing physical record.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setScannerOpen(true)}>
          <ScanLine className="h-4 w-4 mr-2" />
          Scan Physical Record
        </Button>
      </div>

      {scannedVisits.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-4 py-3 text-sm">
          {scannedVisits.length} visit record(s) from the scan will be imported when you register this patient.
        </div>
      )}

      <PatientRecordScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        mode="patient"
        onApplyToForm={handleScanApply}
        onSaved={() => {
          setScannedVisits([]);
          setFormData({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            date_of_birth: "",
            age: "",
            occupation: "",
            marital_status: "",
            address: "",
            emergency_contact_name: "",
            emergency_contact_phone: "",
            insurance_provider: "",
            insurance_policy_number: "",
            gender: "",
            physician_name: "",
            physician_specialty: "",
            physician_address: "",
            physician_phone: "",
            in_good_health: "",
            in_medical_treatment: "",
            treatment_condition: "",
            serious_illness: "",
            illness_description: "",
            hospitalized: "",
            hospitalization_details: "",
            taking_medication: "",
            medication_details: "",
            uses_tobacco: "",
            uses_alcohol_drugs: "",
            allergies: [],
            other_allergy: "",
            bleeding_time: "",
            is_pregnant: "",
            is_nursing: "",
            taking_birth_control: "",
            blood_type: "",
            blood_pressure: "",
            medical_conditions: [],
          });
          setIncludeMedicalHistory(false);
        }}
      />

    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  placeholder="Enter age"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange("occupation", e.target.value)}
                  placeholder="Enter occupation"
                />
              </div>
              <div>
                <Label htmlFor="marital_status">Marital Status</Label>
                <Select value={formData.marital_status} onValueChange={(value) => handleInputChange("marital_status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact & Insurance - Now Optional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emergency Contact & Insurance (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="insurance_provider">Insurance Provider</Label>
              <Input
                id="insurance_provider"
                value={formData.insurance_provider}
                onChange={(e) => handleInputChange("insurance_provider", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="insurance_policy_number">Insurance Policy Number</Label>
              <Input
                id="insurance_policy_number"
                value={formData.insurance_policy_number}
                onChange={(e) => handleInputChange("insurance_policy_number", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical History - Optional Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-3">
            <Checkbox
              id="include_medical_history"
              checked={includeMedicalHistory}
              onCheckedChange={(checked) => setIncludeMedicalHistory(checked as boolean)}
            />
            <Label htmlFor="include_medical_history" className="cursor-pointer">
              Include Medical History (Optional)
            </Label>
          </CardTitle>
        </CardHeader>
        {includeMedicalHistory && (
          <CardContent className="space-y-6">
            {/* Physician Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Physician Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="physician_name">Name of Physician</Label>
                  <Input
                    id="physician_name"
                    value={formData.physician_name}
                    onChange={(e) => handleInputChange("physician_name", e.target.value)}
                    placeholder="Dr. _________________________"
                  />
                </div>
                <div>
                  <Label htmlFor="physician_specialty">Specialty (if applicable)</Label>
                  <Input
                    id="physician_specialty"
                    value={formData.physician_specialty}
                    onChange={(e) => handleInputChange("physician_specialty", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="physician_address">Office Address</Label>
                  <Input
                    id="physician_address"
                    value={formData.physician_address}
                    onChange={(e) => handleInputChange("physician_address", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="physician_phone">Office Number</Label>
                  <Input
                    id="physician_phone"
                    value={formData.physician_phone}
                    onChange={(e) => handleInputChange("physician_phone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Health Questions */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">General Health</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Are you in good health?</Label>
                  <RadioGroup value={formData.in_good_health} onValueChange={(value) => handleInputChange("in_good_health", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="good_health_yes" />
                      <Label htmlFor="good_health_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="good_health_no" />
                      <Label htmlFor="good_health_no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Are you in medical treatment now?</Label>
                  <RadioGroup value={formData.in_medical_treatment} onValueChange={(value) => handleInputChange("in_medical_treatment", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="treatment_yes" />
                      <Label htmlFor="treatment_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="treatment_no" />
                      <Label htmlFor="treatment_no">No</Label>
                    </div>
                  </RadioGroup>
                  {formData.in_medical_treatment === "yes" && (
                    <div>
                      <Label htmlFor="treatment_condition">What condition?</Label>
                      <Input
                        id="treatment_condition"
                        value={formData.treatment_condition}
                        onChange={(e) => handleInputChange("treatment_condition", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Have you ever had serious illness or surgical operation?</Label>
                  <RadioGroup value={formData.serious_illness} onValueChange={(value) => handleInputChange("serious_illness", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="illness_yes" />
                      <Label htmlFor="illness_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="illness_no" />
                      <Label htmlFor="illness_no">No</Label>
                    </div>
                  </RadioGroup>
                  {formData.serious_illness === "yes" && (
                    <div>
                      <Label htmlFor="illness_description">What illness or operation?</Label>
                      <Input
                        id="illness_description"
                        value={formData.illness_description}
                        onChange={(e) => handleInputChange("illness_description", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Have you ever been hospitalized?</Label>
                  <RadioGroup value={formData.hospitalized} onValueChange={(value) => handleInputChange("hospitalized", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="hospital_yes" />
                      <Label htmlFor="hospital_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="hospital_no" />
                      <Label htmlFor="hospital_no">No</Label>
                    </div>
                  </RadioGroup>
                  {formData.hospitalized === "yes" && (
                    <div>
                      <Label htmlFor="hospitalization_details">When and why?</Label>
                      <Input
                        id="hospitalization_details"
                        value={formData.hospitalization_details}
                        onChange={(e) => handleInputChange("hospitalization_details", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Are you taking any prescription/non-prescription medication?</Label>
                  <RadioGroup value={formData.taking_medication} onValueChange={(value) => handleInputChange("taking_medication", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="medication_yes" />
                      <Label htmlFor="medication_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="medication_no" />
                      <Label htmlFor="medication_no">No</Label>
                    </div>
                  </RadioGroup>
                  {formData.taking_medication === "yes" && (
                    <div>
                      <Label htmlFor="medication_details">Please specify</Label>
                      <Textarea
                        id="medication_details"
                        value={formData.medication_details}
                        onChange={(e) => handleInputChange("medication_details", e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Do you use tobacco products?</Label>
                  <RadioGroup value={formData.uses_tobacco} onValueChange={(value) => handleInputChange("uses_tobacco", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="tobacco_yes" />
                      <Label htmlFor="tobacco_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="tobacco_no" />
                      <Label htmlFor="tobacco_no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Do you use alcohol, cocaine or other dangerous drugs?</Label>
                  <RadioGroup value={formData.uses_alcohol_drugs} onValueChange={(value) => handleInputChange("uses_alcohol_drugs", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="drugs_yes" />
                      <Label htmlFor="drugs_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="drugs_no" />
                      <Label htmlFor="drugs_no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Allergies Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Allergies</h4>
              <div className="space-y-2">
                <Label>Are you allergic to any of the following? (please check)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allergyOptions.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergy_${allergy}`}
                        checked={formData.allergies.includes(allergy)}
                        onCheckedChange={(checked) => handleCheckboxChange("allergies", allergy, checked as boolean)}
                      />
                      <Label htmlFor={`allergy_${allergy}`} className="text-sm">{allergy}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="other_allergy_check"
                    checked={formData.other_allergy !== ""}
                    onCheckedChange={(checked) => {
                      if (!checked) handleInputChange("other_allergy", "");
                    }}
                  />
                  <Label htmlFor="other_allergy_check">Other</Label>
                  <Input
                    value={formData.other_allergy}
                    onChange={(e) => handleInputChange("other_allergy", e.target.value)}
                    placeholder="Specify other allergy"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Vital Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Vital Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="bleeding_time">Bleeding Time</Label>
                  <Input
                    id="bleeding_time"
                    value={formData.bleeding_time}
                    onChange={(e) => handleInputChange("bleeding_time", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="blood_type">Blood Type</Label>
                  <Input
                    id="blood_type"
                    value={formData.blood_type}
                    onChange={(e) => handleInputChange("blood_type", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="blood_pressure">Blood Pressure</Label>
                  <Input
                    id="blood_pressure"
                    value={formData.blood_pressure}
                    onChange={(e) => handleInputChange("blood_pressure", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Women Only Section */}
            {formData.gender === "female" && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base">For Women Only</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label>Are you Pregnant?</Label>
                    <RadioGroup value={formData.is_pregnant} onValueChange={(value) => handleInputChange("is_pregnant", value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="pregnant_yes" />
                        <Label htmlFor="pregnant_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="pregnant_no" />
                        <Label htmlFor="pregnant_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Are you nursing?</Label>
                    <RadioGroup value={formData.is_nursing} onValueChange={(value) => handleInputChange("is_nursing", value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="nursing_yes" />
                        <Label htmlFor="nursing_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="nursing_no" />
                        <Label htmlFor="nursing_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Are you taking birth control pills?</Label>
                    <RadioGroup value={formData.taking_birth_control} onValueChange={(value) => handleInputChange("taking_birth_control", value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="birth_control_yes" />
                        <Label htmlFor="birth_control_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="birth_control_no" />
                        <Label htmlFor="birth_control_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {/* Medical Conditions */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Do you have or have had any of the following? (Check which apply)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {medicalConditions.map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`condition_${condition}`}
                      checked={formData.medical_conditions.includes(condition)}
                      onCheckedChange={(checked) => handleCheckboxChange("medical_conditions", condition, checked as boolean)}
                    />
                    <Label htmlFor={`condition_${condition}`} className="text-sm">{condition}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Registering..." : "Register Patient"}
      </Button>
    </form>
    </>
  );
};

export default PatientForm;
