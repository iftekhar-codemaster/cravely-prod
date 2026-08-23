import { NextRequest, NextResponse } from "next/server";
import {
  checkAndIncrementUser,
  checkGlobalLimit,
} from "@/lib/server/uploadUsage";

// R2 upload endpoint. Activated by env vars (Cloudflare R2, S3-compatible).
// Auth: requires a valid Firebase ID token (verified via Identity Toolkit).
// Rate-limited per user + globally to protect the R2 free tier (Class A ops).
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE,
  );
}

async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { localId: string }[] };
    return data.users?.[0] ? { uid: data.users[0].localId } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Uploads not configured (missing R2 env vars)." },
      { status: 501 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  const user = idToken ? await verifyIdToken(idToken) : null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Rate limits — protect the R2 free tier (Class A = write ops)
  if (!(await checkGlobalLimit())) {
    return NextResponse.json(
      { error: "Daily upload capacity reached. Try again tomorrow." },
      { status: 429 },
    );
  }
  const limit = await checkAndIncrementUser(user.uid);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Daily upload limit reached (${limit.limit}/day). Resets at midnight UTC.`,
      },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "misc");
  const restaurantId = String(form.get("restaurantId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max size is 2MB." }, { status: 413 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Images only." }, { status: 415 });
  }
  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurantId." }, { status: 400 });
  }

  const [{ S3Client, PutObjectCommand }, crypto] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("node:crypto"),
  ]);
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `restaurants/${restaurantId}/${kind}/${Date.now()}_${crypto
    .randomBytes(6)
    .toString("hex")}.${ext || "jpg"}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  const url = `${process.env.R2_PUBLIC_BASE!.replace(/\/$/, "")}/${key}`;
  return NextResponse.json({ url, key });
}
