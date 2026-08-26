// Serves /firebase-messaging-sw.js — the FCM background-push service worker —
// with the Firebase web config injected from env at request time.

export const dynamic = "force-dynamic";

export async function GET() {
  const js = `
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? ""}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? ""}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ""}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ""}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Cravely";
  self.registration.showNotification(title, {
    body: payload.notification?.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.data?.notificationId,
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
