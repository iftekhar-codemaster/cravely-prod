import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    (fwd ? fwd.split(",")[0].trim() : null) ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  return NextResponse.json(
    { ip: ip.replace(/^::ffff:/, "") },
    { headers: { "cache-control": "no-store" } },
  );
}
