/* House In Hands service worker — web push */
self.addEventListener("push", (event) => {
  let data = { title: "House In Hands", body: "You have a new update.", url: "/portal/messages", tag: "hih" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "House In Hands", {
      body: data.body || "",
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: data.tag || "hih",
      data: { url: data.url || "/portal/messages" },
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/portal/messages";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
