// Uploads a stable healthcheck image to the R2 bucket root for uptime
// monitors (Better Stack etc.). Safe to re-run — overwrites the same key.
//
//   node --env-file-if-exists=.env scripts/upload-healthcheck.ts
//
// Requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
// R2_PUBLIC_BASE (same vars as /api/upload).

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET || !PUBLIC_BASE) {
  console.error(
    "Missing R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE).",
  );
  process.exit(1);
}

const KEY = "healthcheck.png";
const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

await client.send(
  new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: readFileSync(new URL("../public/logo-256.png", import.meta.url)),
    ContentType: "image/png",
    CacheControl: "public, max-age=86400",
  }),
);

console.log(`Uploaded: ${PUBLIC_BASE.replace(/\/$/, "")}/${KEY}`);
