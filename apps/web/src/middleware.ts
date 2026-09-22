import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware.
 *
 * Checks Auth.js session cookie to guard dashboard routes and redirect
 * authenticated users away from login/signup pages.
 *
 * Running this without importing Node.js DB drivers ensures 100% Edge
 * runtime compatibility and sub-millisecond execution. Full session
 * verification is also performed on server components within /dashboard.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Auth.js v5 / NextAuth session cookies
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = Boolean(sessionToken);
  const isOnDashboard = pathname.startsWith("/dashboard");
  const isOnAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email");

  // Protect dashboard routes
  if (isOnDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run middleware on all routes except static files and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
