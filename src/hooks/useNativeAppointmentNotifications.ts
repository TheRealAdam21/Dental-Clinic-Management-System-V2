import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { dataService } from "@/services/dataService";
import type { Appointment } from "@/types";

type UserLike = {
  role?: "admin" | "dentist";
  dentist_id?: string;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DAILY_OVERVIEW_ID = 900_001;
const REMINDER_ID_BASE = 1_000_000;

const hashToNotificationId = (key: string): number => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return REMINDER_ID_BASE + (Math.abs(hash) % 800_000);
};

const getManilaDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
};

const getNextManila8am = (): Date => {
  const { year, month, day, hour } = getManilaDateParts();

  if (hour < 8) {
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  const noonManilaUtc = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  const nextDay = new Date(noonManilaUtc.getTime() + 24 * 60 * 60 * 1000);
  const nextParts = getManilaDateParts(nextDay);
  return new Date(Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day, 0, 0, 0));
};

const getDentistAppointmentsForToday = (appointments: Appointment[]) => {
  const { year, month, day } = getManilaDateParts();
  return appointments.filter((appt) => {
    if (appt.status === "cancelled" || appt.status === "completed") return false;
    const apptParts = getManilaDateParts(new Date(appt.appointment_datetime));
    return apptParts.year === year && apptParts.month === month && apptParts.day === day;
  });
};

export const useNativeAppointmentNotifications = (user: UserLike | null) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user || user.role !== "dentist" || !user.dentist_id) return;

    const scheduleNotifications = async () => {
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== "granted") return;

        const allAppointments = await dataService.getAppointments();
        const dentistAppointments = allAppointments.filter(
          (appt) =>
            appt.dentist_id === user.dentist_id &&
            appt.status !== "cancelled" &&
            appt.status !== "completed"
        );

        const pending = await LocalNotifications.getPending();
        const managedIds = (pending.notifications ?? [])
          .map((n) => n.id)
          .filter((id): id is number => typeof id === "number" && id >= REMINDER_ID_BASE);

        if (managedIds.length > 0) {
          await LocalNotifications.cancel({
            notifications: managedIds.map((id) => ({ id })),
          });
        }

        const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
        const now = Date.now();

        for (const appt of dentistAppointments) {
          const apptTime = new Date(appt.appointment_datetime).getTime();
          const reminderTime = apptTime - TWO_HOURS_MS;
          if (reminderTime <= now || apptTime <= now) continue;

          const patientName =
            `${appt.patient?.first_name ?? ""} ${appt.patient?.last_name ?? ""}`.trim() ||
            "a patient";
          const apptDateText = new Date(appt.appointment_datetime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          notifications.push({
            id: hashToNotificationId(`2h.${appt.id}`),
            title: "Upcoming appointment in 2 hours",
            body: `${patientName} at ${apptDateText} (${appt.service_type})`,
            schedule: { at: new Date(reminderTime) },
            extra: { appointmentId: appt.id },
          });
        }

        const todayAppointments = getDentistAppointmentsForToday(dentistAppointments).sort(
          (a, b) =>
            new Date(a.appointment_datetime).getTime() -
            new Date(b.appointment_datetime).getTime()
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

        const nextOverviewAt = getNextManila8am();
        if (nextOverviewAt.getTime() > now) {
          notifications.push({
            id: DAILY_OVERVIEW_ID,
            title: "Daily patient overview",
            body: overviewMessage,
            schedule: { at: nextOverviewAt },
            extra: { type: "daily_overview" },
          });
        }

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
        }
      } catch (error) {
        console.error("[NativeNotifications] Scheduling failed:", error);
      }
    };

    scheduleNotifications();
    const interval = window.setInterval(scheduleNotifications, 15 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user?.dentist_id, user?.role]);
};
