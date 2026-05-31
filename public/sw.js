// ── Service Worker: Invisible Map ──────────────────────────────────────────
// Strategy: Network-First for EVERYTHING (dev & prod).
// This ensures code changes are always picked up immediately.
// Cache is only used as a fallback when the user is fully offline.
// ───────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'invisible-map-v3'; // ← bump version to wipe ALL old caches

// ── Install: skip waiting so this SW takes over instantly ──────────────────
self.addEventListener('install', (event) => {
  // Don't pre-cache anything — always go to network first.
  self.skipWaiting();
});

// ── Activate: delete every old cache ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        // Delete ALL caches including the current one so nothing is stale
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log('[SW] All old caches cleared. Taking control of all clients.');
      return self.clients.claim();
    })
  );
});

// ── Fetch: Network-First for every request ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API calls or external origins (Supabase, tiles, etc.)
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/health') ||
    url.origin !== self.location.origin
  ) {
    return; // Let the browser handle it directly — no SW interference
  }

  // Network-First: always try network, fall back to cache only if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful same-origin responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache if available
        return caches.match(event.request);
      })
  );
});
