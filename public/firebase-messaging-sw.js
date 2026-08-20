importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBQlbwSu-63k5lCkg-_RbhimHdUahJIh3c",
  authDomain: "construction-bard.firebaseapp.com",
  projectId: "construction-bard",
  storageBucket: "construction-bard.firebasestorage.app",
  messagingSenderId: "923654871925",
  appId: "1:923654871925:web:f8e06f190fea759719d13c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    "New Chat Message";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "You have received a new message.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: {
      roomId: payload.data?.roomId || payload.data?.chatId || "",
      chatId: payload.data?.chatId || payload.data?.roomId || "",
      type: payload.data?.type || "chat"
    },
    vibrate: [100, 50, 100],
    actions: [{ action: "open", title: "Open Chat" }]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const roomId = data.roomId || data.chatId;

  const targetPath = roomId
    ? `/company-admin/chat?roomId=${roomId}`
    : "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({
              type: "NAVIGATE_CHAT",
              roomId
            });
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetPath);
        }
      })
  );
});