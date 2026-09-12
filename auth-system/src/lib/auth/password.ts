import * as argon2 from "argon2";

/**
 * Password hashing using argon2id — an adaptive, memory-hard algorithm.
 *
 * Why argon2id:
 * - Memory-hard: resists GPU/ASIC brute-force attacks
 * - Adaptive: cost factors can be tuned as hardware improves
 * - argon2id variant: hybrid of argon2i (side-channel resistant) and argon2d (GPU resistant)
 *
 * Configuration:
 * - memoryCost: 65536 KB (64 MB) — makes each hash attempt expensive in memory
 * - timeCost: 3 iterations — number of passes over memory
 * - parallelism: 1 — single-threaded to avoid contention in Node.js
 * - type: argon2id — recommended variant
 *
 * What would go wrong with cost factor 4 (minimum)?
 * A cost factor of 4 (memoryCost=4 KB) would make hashing nearly instant,
 * removing the computational expense that slows down brute-force attacks.
 * An attacker could try millions of passwords per second.
 */

const ARGON2_OPTIONS: any = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 1,
};

/**
 * Hash a plaintext password using argon2id.
 * The resulting hash includes the algorithm, salt, and parameters — all in one string.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const hash = await argon2.hash(plaintext, ARGON2_OPTIONS);
  return hash.toString();
}

/**
 * Verify a plaintext password against a stored argon2id hash.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
