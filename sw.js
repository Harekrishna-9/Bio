const CACHE_NAME = "hk-bio-admin-pwa-authsafe-v3";
const STATIC_ASSETS = [
  "/Bio/admin.html",
  "/Bio/admin.css",
  "/Bio/admin-v6.css",
  "/Bio/admin.js",
  "/Bio/supabase-config.js",
  "/Bio/manifest.webmanifest",
  "/Bio/offline.html",
  "/Bio/icons/icon-180.png",
  "/Bio/icons/icon-192.png",
  "/Bio/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Supabase/API/CDN dynamic traffic.
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.com") ||
    url.hostname.includes("cdn.jsdelivr.net")
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for HTML/JS/CSS so GitHub updates appear quickly.
  const isAppCode =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css");

  if (isAppCode) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === "navigate") return caches.match("/Bio/offline.html");
          throw new Error("Offline");
        })
    );
    return;
  }

  // Cache-first for icons/static files.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }))
  );
});
