import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "aw_live_";
const KEY_BYTES = 32; // 256-bit key → 64 hex chars

/**
 * Generates a new AgentWatch API key.
 *
 * Returns:
 * - `rawKey`: The full key shown ONCE to the user (e.g. "aw_live_abc123...").
 *   This value is NEVER stored — only shown at creation time.
 * - `keyHash`: SHA-256 hash of the raw key. Stored in the database.
 * - `keyPrefix`: First 12 chars for display (e.g. "aw_live_abc1").
 *   Stored in the database so users can identify their keys.
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const randomPart = randomBytes(KEY_BYTES).toString("hex");
  const rawKey = `${KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16); // "aw_live_" (8) + 8 chars

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Hashes an API key using SHA-256.
 * Used both when generating keys and when validating incoming requests.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Masks a key prefix for display: "aw_live_abc1" → "aw_live_abc1••••••••"
 */
export function maskKeyPrefix(prefix: string): string {
  return `${prefix}${"•".repeat(8)}`;
}
