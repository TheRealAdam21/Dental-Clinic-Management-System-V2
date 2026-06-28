import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppointmentRow = {
  id: string;
  dentist_id: string;
  appointment_datetime: string;
  service_type: string;
  status: string;
  patient?: { first_name?: string; last_name?: string } | null;
};

const sendPush = async (subscription: any, payload: Record<string, string>) => {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in function environment");
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  await webpush.sendNotification(subscription, JSON.stringify(payload));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRole) {
      throw new Error("Missing SERVICE_ROLE_KEY secret");
    }
    const admin = createClient(supabaseUrl, serviceRole);

    const now = new Date();
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: appointments, error: appointmentsError } = await admin
      .from("appointments")
      .select("id, dentist_id, appointment_datetime, service_type, status, patient:patients(first_name,last_name)")
      .gte("appointment_datetime", now.toISOString())
      .lte("appointment_datetime", inTwoHours.toISOString())
      .in("status", ["pending", "approved"]);

    if (appointmentsError) throw appointmentsError;

    let sentCount = 0;
    for (const appt of (appointments || []) as AppointmentRow[]) {
      const { data: alreadySent } = await admin
        .from("notification_dispatch_logs")
        .select("id")
        .eq("dentist_id", appt.dentist_id)
        .eq("appointment_id", appt.id)
        .eq("notification_type", "appointment_2h")
        .limit(1);

      if (alreadySent && alreadySent.length > 0) continue;

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .eq("dentist_id", appt.dentist_id);

      const patientName = `${appt.patient?.first_name ?? ""} ${appt.patient?.last_name ?? ""}`.trim() || "Patient";
      const apptTime = new Date(appt.appointment_datetime).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });

      for (const sub of subs || []) {
        try {
          await sendPush(sub.subscription, {
            title: "Upcoming appointment in 2 hours",
            body: `${patientName} at ${apptTime} (${appt.service_type})`,
            url: "/",
          });
          sentCount++;
        } catch (pushError) {
          console.error("Push send failed:", pushError);
        }
      }

      await admin.from("notification_dispatch_logs").insert({
        dentist_id: appt.dentist_id,
        appointment_id: appt.id,
        notification_type: "appointment_2h",
        payload: {
          patientName,
          appointmentTime: apptTime,
          serviceType: appt.service_type,
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, sentCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
