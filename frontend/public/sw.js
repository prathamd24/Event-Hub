self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  let title = 'Event Hub Update';
  let options = {
    body: 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if(data.title) title = data.title;
      if(data.body) options.body = data.body;
      if(data.icon) options.icon = data.icon;
      if(data.url) options.data = { url: data.url };
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
