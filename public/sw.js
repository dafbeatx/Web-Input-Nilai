// Service Worker for GradeMaster OS Web Push Notifications
self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[Service Worker] Push event received with no payload.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    // Fallback if payload is plain text
    data = {
      title: 'Notifikasi GradeMaster OS',
      body: event.data.text()
    };
  }

  const title = data.title || 'GradeMaster OS';
  const options = {
    body: data.body || 'Ada informasi akademik baru untuk Anda.',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'remedial-reminder',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Retrieve the url from notification data, fallback to root
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Check if there is already a window open with this url
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
