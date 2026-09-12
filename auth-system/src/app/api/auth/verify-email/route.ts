import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEmailSchema } from "@/lib/validations/auth";
import { verifyCode } from "@/lib/auth/verification";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifyEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // We can verify email either by requiring the user to be logged in 
    // OR by expecting the userId or email in the request.
    // Wait, the brief says "Email verification - code entry field + a resend control".
    // Usually the user receives an email with a code, and the client form includes the email address
    // (passed as query param or state) along with the code.
    // Let's expect 'email' to be sent in the body as well, or we can look up the user by code.
    // But verifyCode requires userId. Let's lookup the user by email first.
    // Since the verifyEmailSchema doesn't have email, let's update it or just add email here.
    // I'll add 'email' to the body expected here, so the client must send it.
    
    // Better: let's expect email in the body.
    const email = body.email as string;
    if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const isValid = await verifyCode(user.id, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
