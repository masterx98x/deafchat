/**
 * DeafChat – Service Worker
 * Handles background notifications when the page is not focused.
 */

const SW_VERSION = '1.0.0';

// Install & activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Listen for messages from the main page
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = data;
    self.registration.showNotification(title, {
      body: body || '',
      icon: '/static/favicon.png',
      badge: '/static/favicon.png',
      tag: tag || 'deafchat',
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url: url || '/' },
    });
  }
});

// When user clicks the notification, focus the chat tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus an existing tab with the chat
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});
