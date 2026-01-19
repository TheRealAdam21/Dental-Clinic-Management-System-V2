import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, User, Phone } from "lucide-react";

interface MedicalHistoryDisplayProps {
  patientId: string;
}

const MedicalHistoryDisplay = ({ patientId }: MedicalHistoryDisplayProps) => {
  const [medicalHistory, setMedicalHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicalHistory();
  }, [patientId]);

  const fetchMedicalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching medical history:', error);
      } else {
        setMedicalHistory(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading medical history...</div>;
  }

  if (!medicalHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Medical History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No medical history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Medical History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Physician Information */}
        {(medicalHistory.physician_name || medicalHistory.physician_specialty || 
          medicalHistory.physician_address || medicalHistory.physician_phone) && (
          <div>
            <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Physician Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {medicalHistory.physician_name && (
                <div>
                  <span className="font-medium">Name:</span> {medicalHistory.physician_name}
                </div>
              )}
              {medicalHistory.physician_specialty && (
                <div>
                  <span className="font-medium">Specialty:</span> {medicalHistory.physician_specialty}
                </div>
              )}
              {medicalHistory.physician_address && (
                <div>
                  <span className="font-medium">Address:</span> {medicalHistory.physician_address}
                </div>
              )}
              {medicalHistory.physician_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="font-medium">Phone:</span> {medicalHistory.physician_phone}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {medicalHistory.medical_conditions && medicalHistory.medical_conditions.length > 0 && (
          <div>
            <h4 className="font-semibold text-base mb-3">Medical Conditions</h4>
            <div className="flex flex-wrap gap-2">
              {medicalHistory.medical_conditions.map((condition: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {medicalHistory.allergies && medicalHistory.allergies.length > 0 && (
          <div>
            <h4 className="font-semibold text-base mb-3">Allergies</h4>
            <div className="flex flex-wrap gap-2">
              {medicalHistory.allergies.map((allergy: string, index: number) => (
                <Badge key={index} variant="destructive">
                  {allergy}
                </Badge>
              ))}
            </div>
            {medicalHistory.other_allergy && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Other:</span> {medicalHistory.other_allergy}
              </div>
            )}
          </div>
        )}

        {/* Health Status */}
        <div>
          <h4 className="font-semibold text-base mb-3">Health Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {medicalHistory.in_good_health && (
              <div>
                <span className="font-medium">Good Health:</span> {medicalHistory.in_good_health}
              </div>
            )}
            {medicalHistory.in_medical_treatment && (
              <div>
                <span className="font-medium">Under Medical Treatment:</span> {medicalHistory.in_medical_treatment}
              </div>
            )}
            {medicalHistory.serious_illness && (
              <div>
                <span className="font-medium">Serious Illness:</span> {medicalHistory.serious_illness}
              </div>
            )}
            {medicalHistory.hospitalized && (
              <div>
                <span className="font-medium">Hospitalized:</span> {medicalHistory.hospitalized}
              </div>
            )}
            {medicalHistory.taking_medication && (
              <div>
                <span className="font-medium">Taking Medication:</span> {medicalHistory.taking_medication}
              </div>
            )}
            {medicalHistory.uses_tobacco && (
              <div>
                <span className="font-medium">Uses Tobacco:</span> {medicalHistory.uses_tobacco}
              </div>
            )}
            {medicalHistory.uses_alcohol_drugs && (
              <div>
                <span className="font-medium">Uses Alcohol/Drugs:</span> {medicalHistory.uses_alcohol_drugs}
              </div>
            )}
            {medicalHistory.blood_type && (
              <div>
                <span className="font-medium">Blood Type:</span> {medicalHistory.blood_type}
              </div>
            )}
            {medicalHistory.blood_pressure && (
              <div>
                <span className="font-medium">Blood Pressure:</span> {medicalHistory.blood_pressure}
              </div>
            )}
            {medicalHistory.bleeding_time && (
              <div>
                <span className="font-medium">Bleeding Time:</span> {medicalHistory.bleeding_time}
              </div>
            )}
          </div>
        </div>

        {/* Pregnancy/Nursing Status */}
        {(medicalHistory.is_pregnant || medicalHistory.is_nursing || medicalHistory.taking_birth_control) && (
          <div>
            <h4 className="font-semibold text-base mb-3">Women's Health</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {medicalHistory.is_pregnant && (
                <div>
                  <span className="font-medium">Pregnant:</span> {medicalHistory.is_pregnant}
                </div>
              )}
              {medicalHistory.is_nursing && (
                <div>
                  <span className="font-medium">Nursing:</span> {medicalHistory.is_nursing}
                </div>
              )}
              {medicalHistory.taking_birth_control && (
                <div>
                  <span className="font-medium">Birth Control:</span> {medicalHistory.taking_birth_control}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {(medicalHistory.medication_details || medicalHistory.illness_description || 
          medicalHistory.hospitalization_details || medicalHistory.treatment_condition) && (
          <div>
            <h4 className="font-semibold text-base mb-3">Additional Details</h4>
            <div className="space-y-2 text-sm">
              {medicalHistory.treatment_condition && (
                <div>
                  <span className="font-medium">Treatment Condition:</span> {medicalHistory.treatment_condition}
                </div>
              )}
              {medicalHistory.medication_details && (
                <div>
                  <span className="font-medium">Medication Details:</span> {medicalHistory.medication_details}
                </div>
              )}
              {medicalHistory.illness_description && (
                <div>
                  <span className="font-medium">Illness Description:</span> {medicalHistory.illness_description}
                </div>
              )}
              {medicalHistory.hospitalization_details && (
                <div>
                  <span className="font-medium">Hospitalization Details:</span> {medicalHistory.hospitalization_details}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalHistoryDisplay;