import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication (client-facing routes)
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/demo",
  "/api/screenshot",
  "/api/comparison",
  "/demo",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("admin_session")?.value;
  if (session !== process.env.ADMIN_SESSION_SECRET) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
