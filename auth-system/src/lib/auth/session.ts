import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Session management with server-side session records.
 *
 * Why sessions over JWTs:
 * - True server-side revocation: deleting the DB record instantly invalidates the session
 * - No need to maintain a blocklist or wait for token expiry
 * - The cookie contains only an opaque session ID — no user data exposed client-side
 * - Cookie configuration: httpOnly (no JS access), secure (HTTPS only in prod),
 *   sameSite=lax (CSRF protection), reasonable expiry
 */

/**
 * Create a new session for the given user.
 * Stores the session record in the database and returns the Set-Cookie header value.
 */
export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  return session.id;
}

/**
 * Set the session cookie on the response.
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Validate a session ID against the database.
 * Returns the associated user if the session is valid and not expired.
 * Expiry is enforced by checking expiresAt in the query — not just the cookie's Max-Age.
 */
export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
      expiresAt: {
        gt: new Date(), // Server-side expiry enforcement
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

/**
 * Invalidate a session by deleting it from the database.
 * This is true server-side revocation — the session ID becomes meaningless
 * even if the cookie still exists on the client.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { id: sessionId },
    });
  } catch {
    // Session may already be deleted or not exist — that's fine
  }
}

/**
 * Clear the session cookie from the client.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Read the session ID from the request cookies.
 */
export async function getSessionFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
