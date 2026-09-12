import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createResetToken } from "@/lib/auth/reset-token";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const identifier = `${ip}:${email}`;

    // Rate Limit: 3 requests per 15 minutes per IP + email
    const rateLimit = await checkRateLimit(identifier, "/api/auth/forgot-password", 3, 15 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter?.toString() ?? "900" }
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: "If that email address is in our database, we will send you an email to reset your password." },
        { status: 200 }
      );
    }

    // Generate Reset Token & Send Email
    const { token } = await createResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json(
      { message: "If that email address is in our database, we will send you an email to reset your password." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
