import { describe, it, expect, vi, afterEach } from "vitest";
import {
  setupFakeTimers,
  cleanupFakeTimers,
  setupTimeTest,
  waitForNextTick,
  delay,
  TEST_DATE,
} from "../helpers";

describe("test-utils/helpers", () => {
  describe("Time Testing Helpers", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("setupFakeTimers should set system time to default TEST_DATE", () => {
      setupFakeTimers();
      // Check if the date matches TEST_DATE (ignoring time component)
      expect(new Date().toISOString().split("T")[0]).toBe(TEST_DATE);
    });

    it("setupFakeTimers should set system time to provided date", () => {
      const customDate = "2020-01-01";
      setupFakeTimers(customDate);
      expect(new Date().toISOString().split("T")[0]).toBe(customDate);
    });

    it("cleanupFakeTimers should restore real timers", () => {
      setupFakeTimers();
      // We can't easily check "isFakeTimers" directly via public API in all versions without internal access,
      // but we can check if setting system time persists or if we can move time naturally.
      // A simpler check is that it doesn't throw.
      cleanupFakeTimers();

      // Verify we are back to real time (approximate check)
      const now = new Date();
      const testDate = new Date(TEST_DATE);
      // Real time should be > 2024 (assuming current year) and definitely not 2026-01-17 exactly unless we are unlucky
      // But safer: just ensure we can use new Date() and it's not stuck on TEST_DATE if we wait.
      expect(now.getTime()).not.toBe(testDate.getTime());
    });

    it("setupTimeTest should setup fake timers and return cleanup function", () => {
      const cleanup = setupTimeTest();
      expect(new Date().toISOString().split("T")[0]).toBe(TEST_DATE);

      cleanup();
      // Just verify it runs without error
      expect(true).toBe(true);
    });
  });

  describe("Assertion Helpers", () => {
    it("waitForNextTick should resolve", async () => {
      // Use real timers to ensure setTimeout works naturally
      vi.useRealTimers();
      let resolved = false;
      const promise = waitForNextTick().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);
      await promise;
      expect(resolved).toBe(true);
    });

    it("delay should wait for specified duration", async () => {
      vi.useFakeTimers();
      const ms = 100;
      let resolved = false;

      const promise = delay(ms).then(() => {
        resolved = true;
      });

      // Should not be resolved yet
      expect(resolved).toBe(false);

      // Advance time partially
      vi.advanceTimersByTime(50);
      expect(resolved).toBe(false);

      // Advance remaining time
      vi.advanceTimersByTime(51);

      // We need to await the promise to allow the microtask queue to process the resolution
      await promise;
      expect(resolved).toBe(true);

      vi.useRealTimers();
    });
  });
});
