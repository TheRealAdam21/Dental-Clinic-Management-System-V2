import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { dataService } from "@/services/dataService";
import type { Appointment } from "@/types";

type UserLike = {
  role?: "admin" | "dentist";
  dentist_id?: string;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const getManilaDateKey = () => {
  const now = new Date();
  const manilaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return manilaDate;
};

const getManilaHour = () => {
  const now = new Date();
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
};

const showNotification = (title: string, body: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }
  toast.info(`${title}: ${body}`);
};

const getDentistAppointmentsForToday = (appointments: Appointment[]) => {
  const today = new Date();
  return appointments.filter((appt) => {
    if (appt.status === "cancelled" || appt.status === "completed") return false;
    const apptDate = new Date(appt.appointment_datetime);
    return (
      apptDate.getFullYear() === today.getFullYear() &&
      apptDate.getMonth() === today.getMonth() &&
      apptDate.getDate() === today.getDate()
    );
  });
};

export const useAppointmentNotifications = (user: UserLike | null) => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user || user.role !== "dentist" || !user.dentist_id) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // Ignore prompt errors and use toast fallback.
      });
    }

    const checkAndNotify = async () => {
      try {
        const allAppointments = await dataService.getAppointments();
        const dentistAppointments = allAppointments.filter(
          (appt) =>
            appt.dentist_id === user.dentist_id &&
            appt.status !== "cancelled" &&
            appt.status !== "completed"
        );

        const now = Date.now();

        // 2-hour reminders
        for (const appt of dentistAppointments) {
          const apptTime = new Date(appt.appointment_datetime).getTime();
          const reminderKey = `toothtime.notified.2h.${appt.id}`;
          const alreadyNotified = localStorage.getItem(reminderKey) === "1";
          if (alreadyNotified) continue;

          const msUntilAppointment = apptTime - now;
          if (msUntilAppointment <= TWO_HOURS_MS && msUntilAppointment > 0) {
            const patientName = `${appt.patient?.first_name ?? ""} ${appt.patient?.last_name ?? ""}`.trim() || "a patient";
            const apptDateText = new Date(appt.appointment_datetime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            showNotification(
              "Upcoming appointment in 2 hours",
              `${patientName} at ${apptDateText} (${appt.service_type})`
            );
            localStorage.setItem(reminderKey, "1");
          }
        }

        // Daily overview at 8:00 AM Manila time
        const manilaHour = getManilaHour();
        const manilaDateKey = getManilaDateKey();
        const overviewKey = `toothtime.notified.daily.${user.dentist_id}.${manilaDateKey}`;
        const alreadyOverviewNotified = localStorage.getItem(overviewKey) === "1";

        if (manilaHour >= 8 && !alreadyOverviewNotified) {
          const todayAppointments = getDentistAppointmentsForToday(dentistAppointments).sort(
            (a, b) =>
              new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime()
          );

          const patientPreview = todayAppointments
            .slice(0, 4)
            .map((appt) => `${appt.patient?.first_name ?? ""} ${appt.patient?.last_name ?? ""}`.trim())
            .filter(Boolean)
            .join(", ");

          const extraCount = Math.max(todayAppointments.length - 4, 0);
          const suffix = extraCount > 0 ? ` +${extraCount} more` : "";
          const overviewMessage =
            todayAppointments.length === 0
              ? "You have no scheduled patients today."
              : `You have ${todayAppointments.length} patient(s) today${patientPreview ? `: ${patientPreview}${suffix}` : "."}`;

          showNotification("Daily patient overview", overviewMessage);
          localStorage.setItem(overviewKey, "1");
        }
      } catch (error) {
        console.error("Appointment notification check failed:", error);
      }
    };

    checkAndNotify();
    const interval = window.setInterval(checkAndNotify, 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user?.dentist_id, user?.role]);
};

