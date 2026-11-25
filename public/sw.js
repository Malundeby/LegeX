// Legeassistent service worker.
//
// Strategy:
//   * Pages (HTML navigations): network first, cache only as offline fallback.
//     Users always get the newest deploy without a hard refresh.
//   * /_next/static/* and icons: cache first. These files have content hashes
//     in their names, so a new deploy uses new URLs and never hits stale cache.
//   * Everything else (API, admin, login/auth pages, other origins such as Supabase):
//     not touched by the service worker at all.
//
// Bump CACHE_NAME when the strategy changes; old caches are deleted on activate.
const CACHE_NAME = "legeassistent-v3";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.add("/manifest.webmanifest");
        // "/" redirects to /login when logged out. Only keep it as the
        // offline page when we got the real start page.
        const response = await fetch(OFFLINE_URL);
        if (response.ok && !response.redirected) await cache.put(OFFLINE_URL, response);
      })
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/glemt-passord") ||
    url.pathname.startsWith("/nytt-passord")
  ) {
    return;
  }

  // Pages: always try the network first.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Hashed build files and icons: cache first.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Anything else (PDFs, manifest, data): network first, cache as offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Skip redirects (e.g. to /login after the session expired) so a
        // login page is never cached in place of a PDF.
        if (response.ok && !response.redirected) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
