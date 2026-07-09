const CACHE_NAME = "king-store-pwa-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://img.icons8.com/color/192/crown.png"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching King Store App Shell");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[Service Worker] Some assets failed to cache during install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Claim clients first
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that Service Worker is active and ready
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      });
    })
  );
});

// Fetch Event with Stale-While-Revalidate Strategy
self.addEventListener("fetch", (event) => {
  // Only intercept standard GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API routes, Firebase Auth, and Firestore requests
  if (
    url.pathname.startsWith("/api") || 
    url.hostname.includes("firebase") || 
    url.hostname.includes("firestore") || 
    url.hostname.includes("googleapis")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore fetch errors when offline
          });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request is a navigation, fallback to /
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
