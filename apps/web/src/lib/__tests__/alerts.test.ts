import { describe, it, expect } from "vitest";

describe("Alerts Evaluation Logic", () => {
  function checkTrigger(operator: string, currentValue: number, threshold: number): boolean {
    if (operator === "gt") return currentValue > threshold;
    if (operator === "gte") return currentValue >= threshold;
    if (operator === "lt") return currentValue < threshold;
    if (operator === "lte") return currentValue <= threshold;
    return false;
  }

  it("evaluates greater-than (gt) operator correctly", () => {
    expect(checkTrigger("gt", 55.0, 50.0)).toBe(true);
    expect(checkTrigger("gt", 50.0, 50.0)).toBe(false);
    expect(checkTrigger("gt", 45.0, 50.0)).toBe(false);
  });

  it("evaluates greater-than-or-equal (gte) operator correctly", () => {
    expect(checkTrigger("gte", 50.0, 50.0)).toBe(true);
    expect(checkTrigger("gte", 51.0, 50.0)).toBe(true);
    expect(checkTrigger("gte", 49.9, 50.0)).toBe(false);
  });

  it("evaluates less-than (lt) operator correctly", () => {
    expect(checkTrigger("lt", 80.0, 95.0)).toBe(true);
    expect(checkTrigger("lt", 95.0, 95.0)).toBe(false);
  });

  it("handles error rate thresholds accurately", () => {
    const total = 100;
    const failures = 6;
    const errorRate = (failures / total) * 100; // 6%

    expect(checkTrigger("gt", errorRate, 5.0)).toBe(true);
    expect(checkTrigger("gt", errorRate, 10.0)).toBe(false);
  });
});
