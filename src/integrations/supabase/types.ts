export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_datetime: string
          created_at: string
          dentist_id: string
          id: string
          notes: string | null
          patient_id: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_datetime: string
          created_at?: string
          dentist_id: string
          id?: string
          notes?: string | null
          patient_id: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_datetime?: string
          created_at?: string
          dentist_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          phone: string | null
          specialization: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          license_number?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          allergies: Json | null
          bleeding_time: string | null
          blood_pressure: string | null
          blood_type: string | null
          created_at: string
          hospitalization_details: string | null
          hospitalized: string | null
          id: string
          illness_description: string | null
          in_good_health: string | null
          in_medical_treatment: string | null
          is_nursing: string | null
          is_pregnant: string | null
          medical_conditions: Json | null
          medication_details: string | null
          other_allergy: string | null
          patient_id: string
          physician_address: string | null
          physician_name: string | null
          physician_phone: string | null
          physician_specialty: string | null
          serious_illness: string | null
          taking_birth_control: string | null
          taking_medication: string | null
          treatment_condition: string | null
          updated_at: string
          uses_alcohol_drugs: string | null
          uses_tobacco: string | null
        }
        Insert: {
          allergies?: Json | null
          bleeding_time?: string | null
          blood_pressure?: string | null
          blood_type?: string | null
          created_at?: string
          hospitalization_details?: string | null
          hospitalized?: string | null
          id?: string
          illness_description?: string | null
          in_good_health?: string | null
          in_medical_treatment?: string | null
          is_nursing?: string | null
          is_pregnant?: string | null
          medical_conditions?: Json | null
          medication_details?: string | null
          other_allergy?: string | null
          patient_id: string
          physician_address?: string | null
          physician_name?: string | null
          physician_phone?: string | null
          physician_specialty?: string | null
          serious_illness?: string | null
          taking_birth_control?: string | null
          taking_medication?: string | null
          treatment_condition?: string | null
          updated_at?: string
          uses_alcohol_drugs?: string | null
          uses_tobacco?: string | null
        }
        Update: {
          allergies?: Json | null
          bleeding_time?: string | null
          blood_pressure?: string | null
          blood_type?: string | null
          created_at?: string
          hospitalization_details?: string | null
          hospitalized?: string | null
          id?: string
          illness_description?: string | null
          in_good_health?: string | null
          in_medical_treatment?: string | null
          is_nursing?: string | null
          is_pregnant?: string | null
          medical_conditions?: Json | null
          medication_details?: string | null
          other_allergy?: string | null
          patient_id?: string
          physician_address?: string | null
          physician_name?: string | null
          physician_phone?: string | null
          physician_specialty?: string | null
          serious_illness?: string | null
          taking_birth_control?: string | null
          taking_medication?: string | null
          treatment_condition?: string | null
          updated_at?: string
          uses_alcohol_drugs?: string | null
          uses_tobacco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string
          marital_status: string | null
          medical_history: string | null
          occupation: string | null
          phone: string
          updated_at: string
          xray_images: string[] | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name: string
          marital_status?: string | null
          medical_history?: string | null
          occupation?: string | null
          phone: string
          updated_at?: string
          xray_images?: string[] | null
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          marital_status?: string | null
          medical_history?: string | null
          occupation?: string | null
          phone?: string
          updated_at?: string
          xray_images?: string[] | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          patient_id: string
          payment_date: string
          payment_method: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          patient_id: string
          payment_date: string
          payment_method: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          patient_id?: string
          payment_date?: string
          payment_method?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          diagnosis: string
          id: string
          notes: string | null
          patient_id: string
          treatment: string
          treatment_cost: number | null
          updated_at: string
          visit_date: string
          xray_images: string[] | null
        }
        Insert: {
          created_at?: string
          diagnosis: string
          id?: string
          notes?: string | null
          patient_id: string
          treatment: string
          treatment_cost?: number | null
          updated_at?: string
          visit_date: string
          xray_images?: string[] | null
        }
        Update: {
          created_at?: string
          diagnosis?: string
          id?: string
          notes?: string | null
          patient_id?: string
          treatment?: string
          treatment_cost?: number | null
          updated_at?: string
          visit_date?: string
          xray_images?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
