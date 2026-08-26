import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { haversineKm } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function adminDb() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  const raw = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  const app =
    getApps().find((a) => a.name === "cravely-admin") ??
    initializeApp(
      { credential: cert({ projectId: raw.project_id, ...raw }) },
      "cravely-admin",
    );
  return getFirestore(app);
}

type Notif = {
  title: string;
  body: string;
  audience?: {
    type: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  };
  restaurantId?: string;
};

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer /, "");
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = adminDb();
  if (!db) {
    return NextResponse.json(
      { error: "push_not_configured" },
      { status: 503 },
    );
  }

  // Verify the caller is an authenticated admin.
  let uid: string;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const caller = await db.collection("users").doc(uid).get();
  const role = caller.get("role");
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { notificationId } = (await req.json()) as { notificationId?: string };
  if (!notificationId) {
    return NextResponse.json({ error: "missing_notification" }, { status: 400 });
  }

  const notifSnap = await db.collection("notifications").doc(notificationId).get();
  if (!notifSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const notif = notifSnap.data() as Notif;

  // Resolve eligible users.
  let eligibleUids: Set<string> | null = null; // null = everyone
  const audience = notif.audience;
  if (audience?.type === "range") {
    const eligible = new Set<string>();
    const usersSnap = await db.collection("users").get();
    usersSnap.forEach((u) => {
      const lat = u.get("locationLat") as number | undefined;
      const lng = u.get("locationLng") as number | undefined;
      if (typeof lat === "number" && typeof lng === "number" && audience.lat != null && audience.lng != null && audience.radiusKm != null) {
        if (haversineKm(lat, lng, audience.lat, audience.lng) <= audience.radiusKm) {
          eligible.add(u.id);
        }
      }
    });
    eligibleUids = eligible;
  }

  // Collect tokens for eligible users.
  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens: string[] = [];
  tokensSnap.forEach((t) => {
    const data = t.data() as { uid?: string; token?: string };
    if (!data.token) return;
    if (eligibleUids && !eligibleUids.has(data.uid ?? "")) return;
    tokens.push(data.token);
  });

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  // sendEach accepts max 500 tokens per call.
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEach(
      batch.map((token) => ({
        token,
        notification: { title: notif.title, body: notif.body },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: notificationId,
          },
          fcmOptions: { link: "https://app.cravely.space/" },
        },
      })),
    );
    sent += res.successCount;
    failed += res.failureCount;
  }

  return NextResponse.json({ sent, failed, total: tokens.length });
}
