/**
 * Generates a random CUID-style ID.
 * Using crypto.randomUUID for simplicity — can be swapped for cuid2 if needed.
 */
export function createId(): string {
  // Remove hyphens so IDs are shorter: 32 hex chars
  return crypto.randomUUID().replace(/-/g, "");
}
