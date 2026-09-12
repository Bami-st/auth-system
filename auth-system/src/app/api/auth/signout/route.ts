import { NextResponse } from "next/server";
import { getSessionFromCookies, invalidateSession, clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  try {
    const sessionId = await getSessionFromCookies();

    if (sessionId) {
      // Server-side invalidation
      await invalidateSession(sessionId);
    }

    // Clear client cookie
    await clearSessionCookie();

    return NextResponse.json(
      { message: "Signed out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
