/* Web Push Service Worker */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    try {
      payload = { title: 'Notification', body: event.data?.text?.() };
    } catch (_e2) {
      payload = { title: 'Notification', body: '' };
    }
  }

  const title = payload.title || 'New pickup offer';
  const options = {
    body: payload.body || '',
    icon: '/manifest.json',
    badge: '/manifest.json',
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
    requireInteraction: true,
    tag: payload.tag || 'scrapco-pickup-offer',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        try {
          if ('focus' in client) {
            await client.focus();
            if ('navigate' in client) await client.navigate(targetUrl);
            return;
          }
        } catch (_e) {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
