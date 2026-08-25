import { NextResponse, type NextRequest } from "next/server";

const APEX = "cravely.space";
const APP_HOST = `app.${APEX}`;
const MARKETING_PATHS = ["/landing", "/privacy", "/terms"];

function isMarketingPath(pathname: string) {
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Host split for one deployment serving two domains:
 * - cravely.space / www → landing page (`/` rewritten to `/landing`);
 *   unknown paths fall through to the app
 * - app.cravely.space (and preview hosts) → the app; marketing paths
 *   308-redirect to the apex so canonicals stay clean
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  const isApex = host === APEX || host === `www.${APEX}`;
  if (!isApex) {
    if (isMarketingPath(pathname)) {
      return NextResponse.redirect(
        new URL(`https://${APEX}${pathname}${search}`, request.url),
        308,
      );
    }
    return NextResponse.next();
  }

  if (host === `www.${APEX}`) {
    return NextResponse.redirect(
      new URL(`https://${APEX}${pathname}${search}`, request.url),
      308,
    );
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", request.url));
  }
  if (isMarketingPath(pathname)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(
    new URL(`https://${APP_HOST}${pathname}${search}`, request.url),
    308,
  );
}

export const proxyConfig = {
  matcher: ["/((?!_next|favicon.ico|api/|.*\\..*).*)"],
};
