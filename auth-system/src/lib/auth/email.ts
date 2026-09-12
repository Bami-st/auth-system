/**
 * Mocked email delivery.
 *
 * This environment has no outbound email provider configured.
 * The code path (generation, hashing/storing, expiry) is identical
 * to a real send — only the delivery step is mocked.
 *
 * When a real email provider becomes available (e.g. SendGrid, Resend, AWS SES),
 * only the functions in this file need to change. The rest of the auth system
 * remains untouched.
 */

/**
 * "Send" a verification code email.
 * In development: logs to the console with clear formatting.
 */
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("📧 VERIFICATION EMAIL (mocked)");
  console.log("=".repeat(60));
  console.log(`To:      ${email}`);
  console.log(`Subject: Your verification code`);
  console.log(`Code:    ${code}`);
  console.log("=".repeat(60) + "\n");
}

/**
 * "Send" a password reset email.
 * In development: logs the reset link to the console.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

  console.log("\n" + "=".repeat(60));
  console.log("📧 PASSWORD RESET EMAIL (mocked)");
  console.log("=".repeat(60));
  console.log(`To:      ${email}`);
  console.log(`Subject: Reset your password`);
  console.log(`Link:    ${resetUrl}`);
  console.log("=".repeat(60) + "\n");
}
