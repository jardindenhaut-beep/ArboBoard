import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet"
  );

  return response;
}

export const config = {
  matcher: [
    "/chef/:path*",
    "/salarie/:path*",
    "/auth/:path*",
    "/connexion/:path*",
    "/inscription/:path*",
    "/mot-de-passe-oublie/:path*",
  ],
};