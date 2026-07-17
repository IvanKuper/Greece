const CACHE = "gris-base44-reset-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.delete(CACHE));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", () => {});
