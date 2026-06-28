self.addEventListener("push", (event) => {
  let payload = {
    title: "Dental Clinic Reminder",
    body: "You have an appointment notification.",
    url: "/",
  };

  try {
    const data = event.data?.json();
    if (data) {
      payload = { ...payload, ...data };
    }
  } catch (_error) {
    // Ignore malformed payload and use default message.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
