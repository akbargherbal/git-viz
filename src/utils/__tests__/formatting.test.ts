// src/utils/__tests__/formatting.test.ts
import { describe, it, expect } from "vitest";
import { formatNumber, cn } from "../formatting";

describe("Formatting Utils", () => {
  describe("formatNumber", () => {
    it("should format millions", () => {
      expect(formatNumber(1500000)).toBe("1.5M");
      expect(formatNumber(2000000)).toBe("2.0M");
    });

    it("should format thousands", () => {
      expect(formatNumber(1500)).toBe("1.5K");
      expect(formatNumber(2500)).toBe("2.5K");
    });

    it("should format small numbers as-is", () => {
      expect(formatNumber(500)).toBe("500");
      expect(formatNumber(0)).toBe("0");
    });
  });

  describe("cn (className utility)", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should ignore conditional falsy values", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", null, undefined, "baz")).toBe("foo baz");
    });
  });
});
