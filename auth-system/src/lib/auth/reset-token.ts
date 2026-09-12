import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_HOURS = 1;

/**
 * Password reset token management.
 *
 * Tokens are:
 * - Cryptographically random (32 bytes, hex-encoded = 64 chars)
 * - Stored as SHA-256 hashes — the raw token is sent via email, never stored in DB
 * - Time-limited: 1 hour expiry, enforced by checking expiresAt in the database
 * - Single-use: once usedAt is set, the token is permanently dead,
 *   even if it hasn't expired yet
 */

/**
 * Generate a cryptographically random token and its SHA-256 hash.
 */
function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/**
 * Hash a token for comparison.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new password reset token for a user.
 * Returns the raw token (to be "sent" via email).
 */
export async function createResetToken(
  userId: string
): Promise<{ token: string }> {
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token };
}

/**
 * Validate and consume a password reset token.
 * Checks: hash match + not expired (server-side) + not already used (single-use).
 * On success, marks the token as used and returns the associated user.
 *
 * Single-use enforcement: once usedAt is set, the token can NEVER be redeemed
 * again, even if not yet expired.
 */
export async function validateAndConsumeToken(
  token: string
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);

  // Find a matching, unexpired, unused token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(), // Server-side expiry enforcement
      },
      usedAt: null, // Not yet used — single-use enforcement
    },
  });

  if (!resetToken) {
    return null;
  }

  // Mark as used — permanently dead after this
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return { userId: resetToken.userId };
}
