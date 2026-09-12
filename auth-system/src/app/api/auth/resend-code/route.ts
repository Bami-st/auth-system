import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resendCodeSchema } from "@/lib/validations/auth";
import { createVerificationCode, checkResendCooldown } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/auth/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resendCodeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const identifier = `${ip}:${email}`;

    // Rate Limit: 1 request per 60 seconds
    const rateLimit = await checkRateLimit(identifier, "/api/auth/resend-code", 1, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter?.toString() ?? "60" }
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist or is already verified, we still return a generic success
    // to prevent enumeration.
    if (!user || user.emailVerifiedAt) {
      return NextResponse.json(
        { message: "If your account exists and is unverified, a code has been sent." },
        { status: 200 }
      );
    }

    // Check server-side cooldown (using lastSentAt)
    const cooldownRemaining = await checkResendCooldown(user.id);
    if (cooldownRemaining > 0) {
      // Cooldown enforced server-side
      return NextResponse.json(
        { error: `Please wait ${cooldownRemaining} seconds before requesting a new code.` },
        { status: 429, headers: { "Retry-After": cooldownRemaining.toString() } }
      );
    }

    // Generate Verification Code & Send Email
    const { code } = await createVerificationCode(user.id);
    await sendVerificationEmail(user.email, code);

    return NextResponse.json(
      { message: "Verification code resent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
