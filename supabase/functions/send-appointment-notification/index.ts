
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AppointmentNotificationRequest {
  dentistEmail: string;
  dentistName: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      dentistEmail, 
      dentistName, 
      patientName, 
      appointmentDate, 
      appointmentTime, 
      serviceType, 
      notes 
    }: AppointmentNotificationRequest = await req.json();

    console.log("Sending appointment notification to:", dentistEmail);

    const emailResponse = await resend.emails.send({
      from: "Dental Clinic <onboarding@resend.dev>",
      to: [dentistEmail],
      subject: "New Appointment Scheduled",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Appointment Scheduled</h1>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #374151; margin-top: 0;">Appointment Details</h2>
            
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Service:</strong> ${serviceType}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          
          <p>Dear Dr. ${dentistName},</p>
          <p>A new appointment has been scheduled for you. Please review the details above and prepare accordingly.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from the Dental Clinic Management System.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
