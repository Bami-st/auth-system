import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signinSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const identifier = `${ip}:${email}`;

    // Rate Limit: 5 requests per 15 minutes per IP + email
    const rateLimit = await checkRateLimit(identifier, "/api/auth/signin", 5, 15 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter?.toString() ?? "900" }
        }
      );
    }

    // Lookup user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Generic error message
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify Password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session & set cookie
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json(
      { message: "Signed in successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
