self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }
  const data = payload.data || {};
  const options = {
    body: payload.body || 'A new Blood Donation Portal alert is available.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.requestId || 'bit-portal-alert',
    data: { url: data.requestId ? `/portal?request=${encodeURIComponent(data.requestId)}` : '/notifications' },
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'Blood Donation Portal', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.navigate(target).then((client) => client?.focus());
    return self.clients.openWindow(target);
  }));
});
