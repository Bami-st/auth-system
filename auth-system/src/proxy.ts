import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

// Routes that require authentication
const protectedRoutes = ["/dashboard"];
const authRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Note: we can't fully validate the session here using Prisma because middleware
  // runs on Edge runtime and Prisma Client doesn't support Edge out of the box
  // without a driver adapter.
  // We can at least check if the session cookie exists.
  // The actual dashboard route (server component) will validate the session against the DB.
  
  const sessionId = request.cookies.get("session_id")?.value;

  if (isProtectedRoute && !sessionId) {
    const signInUrl = new URL("/signin", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Optional: Redirect authenticated users away from auth pages
  if (isAuthRoute && sessionId) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
