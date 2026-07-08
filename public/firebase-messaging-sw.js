importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA-B82e8FwgQBR5iiwLGr6tzI6cDomQP9s",
  authDomain: "numeric-folder-78phd.firebaseapp.com",
  projectId: "numeric-folder-78phd",
  storageBucket: "numeric-folder-78phd.firebasestorage.app",
  messagingSenderId: "80043135372",
  appId: "1:80043135372:web:58ed9bc8c72b03711946a9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || 'https://img.icons8.com/color/192/crown.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
