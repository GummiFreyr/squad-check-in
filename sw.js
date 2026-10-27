// Service worker: receives the daily push and shows it as a phone notification.
importScripts("./config.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Always ask GitHub for the newest app files instead of using a saved copy,
// so updates show up the next time the app opens. Offline, fall back to the saved copy.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).catch(() => fetch(req)));
});

firebase.initializeApp(self.SQUAD_CONFIG.firebase);
firebase.messaging(); // shows notifications sent with a webpush "notification" payload

// Tapping the notification opens the app (or focuses it if it's already open).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("./", self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = all.find((c) => c.url.startsWith(url));
    if (open) return open.focus();
    return clients.openWindow(url);
  })());
});
