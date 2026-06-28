import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserLike = {
  role?: "admin" | "dentist";
  dentist_id?: string;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = (user: UserLike | null) => {
  useEffect(() => {
    if (!user || user.role !== "dentist" || !user.dentist_id) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (!supabase) return;

    const publicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").toString().trim();
    if (!publicKey) {
      console.info("[Push] Skipping registration: VITE_VAPID_PUBLIC_KEY not set");
      return;
    }

    const registerPush = async () => {
      try {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const { error } = await supabase.functions.invoke("register-push-subscription", {
          body: {
            dentistId: user.dentist_id,
            subscription,
          },
        });

        if (error) {
          console.error("[Push] Failed to register subscription:", error);
        }
      } catch (error) {
        console.error("[Push] Registration failed:", error);
      }
    };

    registerPush();
  }, [user?.dentist_id, user?.role]);
};

