const CACHE_NAME = 'medichain-static-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best effort caching of static root assets
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[MediChain SW] Precache partial error (ignored):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('medichain-static-')) {
            console.log('[MediChain SW] Deleting stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. DYNAMIC API & DEV SERVER: PASS THROUGH TO NETWORK
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('vite') ||
    url.protocol.startsWith('ws') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to network
  }

  // 2. NAVIGATION REQUESTS (App Shell)
  // Network first with timeout fallback to cached /index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedHtml = await cache.match('/index.html') || await cache.match('/');
          if (cachedHtml) {
            return cachedHtml;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - MediChain</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #111111; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box; }
                .card { background: #1e1e24; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h1 { color: #A3E635; margin: 0 0 12px 0; font-size: 1.5rem; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0 0 20px 0; }
                button { background: #A3E635; color: #020617; border: none; padding: 10px 20px; font-weight: 600; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>MediChain is Offline</h1>
                <p>You are currently offline. Check your internet connection or try reloading.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 3. STATIC ASSETS (Images, JS, CSS, Fonts, Manifest)
  // Cache first, fallback to network
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpe?g|svg|json|webmanifest)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[MediChain SW] Network fetch failed for asset:', event.request.url);
          throw err;
        });
      })
    );
    return;
  }
});

// ==========================================
// 4. WEB PUSH NOTIFICATIONS (Background Phone Delivery)
// ==========================================

self.addEventListener('push', (event) => {
  console.log('[MediChain SW] Push event received:', event);

  let payload = {
    title: 'মেডিচেইন আপডেট',
    body: 'আপনার অর্ডারের নতুন স্ট্যাটাস আপডেট হয়েছে।',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag: 'medichain-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    image: payload.image || undefined,
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.tag || `medichain_${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || payload.data?.url || '/',
      timestamp: Date.now()
    },
    actions: payload.actions && payload.actions.length > 0 ? payload.actions : [
      { action: 'open', title: 'দেখুন' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[MediChain SW] Notification clicked:', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the network app
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is open, open a new window to the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

