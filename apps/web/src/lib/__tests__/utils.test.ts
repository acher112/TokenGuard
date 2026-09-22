import { describe, it, expect } from "vitest";
import { formatCost, formatDuration, formatNumber, formatRelativeTime } from "@/lib/utils";

describe("formatCost", () => {
  it("formats zero as $0.00", () => expect(formatCost(0)).toBe("$0.00"));
  it("formats sub-cent values with 4 decimal places", () => expect(formatCost(0.0005)).toBe("$0.0005"));
  it("formats sub-dollar values with 3 decimal places", () => expect(formatCost(0.034)).toBe("$0.034"));
  it("formats normal values with 2 decimal places", () => expect(formatCost(1.5)).toBe("$1.50"));
  it("handles NaN gracefully", () => expect(formatCost("not-a-number")).toBe("$0.00"));
});

describe("formatDuration", () => {
  it("formats null as dash", () => expect(formatDuration(null)).toBe("—"));
  it("formats milliseconds", () => expect(formatDuration(500)).toBe("500ms"));
  it("formats seconds", () => expect(formatDuration(2500)).toBe("2.5s"));
  it("formats undefined as dash", () => expect(formatDuration(undefined)).toBe("—"));
});

describe("formatNumber", () => {
  it("formats thousands with comma", () => expect(formatNumber(82421)).toBe("82,421"));
  it("formats small numbers", () => expect(formatNumber(100)).toBe("100"));
});
