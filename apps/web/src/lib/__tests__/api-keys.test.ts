import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, maskKeyPrefix } from "@/lib/api-keys";

describe("API key utilities", () => {
  it("generates a key with aw_live_ prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.startsWith("aw_live_")).toBe(true);
  });

  it("generates a key with correct length", () => {
    const { rawKey } = generateApiKey();
    // "aw_live_" (8) + 64 hex chars = 72 total
    expect(rawKey.length).toBe(72);
  });

  it("generates different keys on each call", () => {
    const { rawKey: key1 } = generateApiKey();
    const { rawKey: key2 } = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  it("hash is deterministic", () => {
    const { rawKey } = generateApiKey();
    const hash1 = hashApiKey(rawKey);
    const hash2 = hashApiKey(rawKey);
    expect(hash1).toBe(hash2);
  });

  it("different keys produce different hashes", () => {
    const { rawKey: key1 } = generateApiKey();
    const { rawKey: key2 } = generateApiKey();
    expect(hashApiKey(key1)).not.toBe(hashApiKey(key2));
  });

  it("keyPrefix is 16 chars", () => {
    const { keyPrefix } = generateApiKey();
    expect(keyPrefix.length).toBe(16);
    expect(keyPrefix.startsWith("aw_live_")).toBe(true);
  });

  it("maskKeyPrefix adds dots", () => {
    const masked = maskKeyPrefix("aw_live_abc1");
    expect(masked).toContain("•");
    expect(masked.startsWith("aw_live_abc1")).toBe(true);
  });
});
