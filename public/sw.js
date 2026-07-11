const CACHE_NAME = 'adminmate-v2';
const STATIC_CACHE = 'adminmate-static-v2';
const DYNAMIC_CACHE = 'adminmate-dynamic-v2';
const OFFLINE_CACHE = 'adminmate-offline-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls and Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // Network first for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/offline.html').then((response) => {
            return response || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Cache first for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response;

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for other requests
  event.respondWith(
    caches.match(request).then((response) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return response;
      });

      return response || fetchPromise;
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AdminMate AI', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if window is already open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingActions());
  }
});

// Queue offline action for later sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_OFFLINE_ACTION') {
    event.waitUntil(queueOfflineAction(event.data.action));
  }
});

async function queueOfflineAction(action) {
  const cache = await caches.open(OFFLINE_CACHE);
  const timestamp = Date.now();
  const actionWithMeta = {
    ...action,
    queuedAt: timestamp,
    retryCount: 0,
    id: `${action.type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
  };

  await cache.put(
    new Request(`/offline-action/${actionWithMeta.id}`),
    new Response(JSON.stringify(actionWithMeta), {
      headers: { 'Content-Type': 'application/json' },
    })
  );

  // Register background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-data');
  }
}

async function syncPendingActions() {
  const cache = await caches.open(OFFLINE_CACHE);
  const requests = await cache.keys();

  for (const request of requests) {
    try {
      const response = await cache.match(request);
      if (!response) continue;

      const action = await response.json();

      // Exponential backoff: max 5 retries
      if (action.retryCount >= 5) {
        await cache.delete(request);
        continue;
      }

      // Attempt to sync
      const syncResponse = await fetch(request.url.replace('/offline-action/', '/api/offline-sync/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      if (syncResponse.ok) {
        await cache.delete(request);
        // Notify client of successful sync
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'OFFLINE_ACTION_SYNCED',
            actionId: action.id,
          });
        }
      } else {
        // Increment retry count
        action.retryCount = (action.retryCount || 0) + 1;
        await cache.put(
          request,
          new Response(JSON.stringify(action), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
