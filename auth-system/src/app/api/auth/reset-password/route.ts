import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { validateAndConsumeToken } from "@/lib/auth/reset-token";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Validate token (checks expiry and single-use internally)
    const validToken = await validateAndConsumeToken(token);

    if (!validToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: validToken.userId },
      data: { passwordHash },
    });

    return NextResponse.json(
      { message: "Password reset successfully. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
