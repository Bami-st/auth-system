import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { createVerificationCode } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/auth/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting (by IP for signup to prevent mass registration)
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimit = await checkRateLimit(ip, "/api/auth/signup", 3, 15 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter?.toString() ?? "900" }
        }
      );
    }

    // 2. Parse and Validate Request Body
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // 3. Check if user already exists
    // We do this explicitly to differentiate between a truly new user
    // and an idempotent retry vs a collision attempt
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Return a generic success to prevent email enumeration,
      // OR we could return 409 Conflict if we are okay with letting
      // users know the email is taken (which is common for signups).
      // The brief states: "idempotent signup endpoint - a double submission... must create exactly one account, not error ambiguously or create duplicates"
      // If the password hash matches (or if we just assume it's an idempotent retry), we can resend the code.
      // But we can't check plaintext password against hash securely just for idempotency without exposing risk.
      // The brief asks for "upsert" with unique email constraint. Let's do that instead of findUnique.
    }

    // 4. Hash Password
    const passwordHash = await hashPassword(password);

    // 5. Idempotent Upsert User
    // If the email already exists, we do NOT update the password (to prevent takeover).
    // We just return the existing user (idempotency).
    // Prisma's upsert requires update data, so we can just update a dummy field or do nothing.
    // Wait, prisma upsert requires `update` to have something. We can update `updatedAt`.
    const user = await prisma.user.upsert({
      where: { email },
      update: {}, // Don't change anything if user exists
      create: {
        name,
        email,
        passwordHash,
      },
    });

    // 6. Generate Verification Code
    const { code } = await createVerificationCode(user.id);

    // 7. Send Email
    await sendVerificationEmail(user.email, code);

    // 8. Return Success
    // We return 201 Created (even if idempotent, or 200 if we wanted to be strict, but 201 is fine)
    return NextResponse.json(
      { message: "Account created successfully. Please verify your email." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
