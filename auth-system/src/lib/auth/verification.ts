import { randomInt, createHash } from "crypto";
import { prisma } from "@/lib/db";

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Email verification code management.
 *
 * Codes are:
 * - 6-digit numeric (easy to type from an email)
 * - Stored as SHA-256 hashes (not plaintext) — if the DB leaks, codes are not exposed
 * - Time-limited: enforced by checking expiresAt in the database query
 * - Single-use: consumedAt is set when verified, preventing replay
 *
 * Why SHA-256 for codes (not argon2):
 * These are short-lived OTPs (15 minutes), not passwords. SHA-256 is sufficient
 * because the code expires before a brute-force attempt could succeed, and
 * rate limiting on the verification endpoint adds another layer.
 */

/**
 * Generate a cryptographically random 6-digit code and its SHA-256 hash.
 */
function generateCode(): { code: string; codeHash: string } {
  // Generate a random 6-digit number (100000–999999)
  const code = randomInt(100000, 1000000).toString();
  const codeHash = createHash("sha256").update(code).digest("hex");
  return { code, codeHash };
}

/**
 * Hash a code for comparison.
 */
export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Create a new verification code for a user.
 * Invalidates any previous unconsumed codes for this user.
 */
export async function createVerificationCode(
  userId: string
): Promise<{ code: string }> {
  const { code, codeHash } = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate all previous unconsumed codes for this user
  await prisma.verificationCode.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(), // Mark as consumed so they can't be used
    },
  });

  // Create new code
  await prisma.verificationCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
      lastSentAt: new Date(),
    },
  });

  return { code };
}

/**
 * Verify a code against the database.
 * Checks: hash match + not expired (server-side) + not already consumed.
 * On success, marks the code as consumed (single-use).
 */
export async function verifyCode(
  userId: string,
  code: string
): Promise<boolean> {
  const codeHash = hashCode(code);

  // Find a matching, unexpired, unconsumed code
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      userId,
      codeHash,
      expiresAt: {
        gt: new Date(), // Server-side expiry enforcement
      },
      consumedAt: null, // Not yet used
    },
  });

  if (!verificationCode) {
    return false;
  }

  // Mark as consumed — single-use
  await prisma.verificationCode.update({
    where: { id: verificationCode.id },
    data: { consumedAt: new Date() },
  });

  return true;
}

/**
 * Check if the resend cooldown has elapsed for a user.
 * Returns the number of seconds remaining if still in cooldown, or 0 if allowed.
 */
export async function checkResendCooldown(userId: string): Promise<number> {
  const latestCode = await prisma.verificationCode.findFirst({
    where: { userId },
    orderBy: { lastSentAt: "desc" },
  });

  if (!latestCode) {
    return 0;
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - latestCode.lastSentAt.getTime()) / 1000
  );
  const remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;

  return remaining > 0 ? remaining : 0;
}
