/**
 * Tests for Card Validation Utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validateCard,
  formatValidationReport,
  createHealthMonitor,
  startMonitoring,
  getHealthStats,
  validateRegistry,
} from "../utils/cardValidation";
import {
  ZetaCardContract,
  CardMeta,
  CardFailure,
  CardActivationContext,
} from "../cardContract";

// Mock card for testing
class MockCard implements ZetaCardContract<{ value: number }> {
  readonly id = "ζ.card.mock";
  readonly meta: CardMeta = {
    title: "Mock Card",
    description: "A test card",
    tags: ["test"],
  };

  private state = { value: 0 };
  private shouldFail = false;

  getState() {
    return { ...this.state };
  }

  setState(next: { value: number }) {
    this.state = { ...next };
  }

  activate(ctx?: CardActivationContext) {
    // Mock activation
  }

  getFailures(): CardFailure[] {
    if (this.shouldFail) {
      return [
        {
          code: "test_failure",
          message: "Test failure triggered",
          severity: "error",
        },
      ];
    }
    return [];
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }
}

// Bad card that returns mutable state
class MutableCard implements ZetaCardContract<{ value: number }> {
  readonly id = "ζ.card.mutable";
  readonly meta: CardMeta = {
    title: "Mutable Card",
    description: "Returns mutable state (bad)",
    tags: ["test"],
  };

  private state = { value: 0 };

  getState() {
    return this.state; // Returns reference!
  }

  setState(next: { value: number }) {
    this.state = next;
  }

  activate(ctx?: CardActivationContext) {
    // Mock activation
  }
}

describe("Card Validation", () => {
  describe("validateCard", () => {
    it("should validate a properly implemented card", () => {
      const card = new MockCard();
      const result = validateCard(card);

      expect(result.cardId).toBe("ζ.card.mock");
      // Card is not in registry, so will have warnings but no contract failures
      expect(result.checks).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it("should detect mutable state", () => {
      const card = new MutableCard();
      const result = validateCard(card);

      const immutabilityCheck = result.checks.find(
        (c) => c.name === "State Immutability"
      );
      expect(immutabilityCheck).toBeDefined();
      expect(immutabilityCheck?.passed).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect card failures", () => {
      const card = new MockCard();
      card.setShouldFail(true);
      
      const result = validateCard(card);

      const healthCheck = result.checks.find((c) => c.name === "Current Health");
      expect(healthCheck).toBeDefined();
      expect(healthCheck?.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it("should check metadata completeness", () => {
      const card = new MockCard();
      const result = validateCard(card);

      const metadataCheck = result.checks.find(
        (c) => c.name === "Metadata Completeness"
      );
      expect(metadataCheck).toBeDefined();
      expect(metadataCheck?.passed).toBe(true);
    });
  });

  describe("formatValidationReport", () => {
    it("should format validation results as text", () => {
      const card = new MockCard();
      const result = validateCard(card);
      const report = formatValidationReport(result);

      expect(report).toContain("Card Validation Report");
      expect(report).toContain("ζ.card.mock");
      // Mock card is not in registry, so it should fail
      expect(report).toContain("FAILED");
    });

    it("should show failures in report", () => {
      const card = new MockCard();
      card.setShouldFail(true);
      
      const result = validateCard(card);
      const report = formatValidationReport(result);

      expect(report).toContain("Failures:");
      expect(report).toContain("test_failure");
    });
  });

  describe("Health Monitoring", () => {
    it("should create a health monitor", () => {
      const card = new MockCard();
      const monitor = createHealthMonitor(card, 100);

      expect(monitor.cardId).toBe("ζ.card.mock");
      expect(monitor.checkInterval).toBe(100);
      expect(monitor.active).toBe(false);
      expect(monitor.failureHistory).toHaveLength(0);
    });

    it("should monitor card health over time", async () => {
      const card = new MockCard();
      const monitor = createHealthMonitor(card, 50);
      
      const failures: CardFailure[][] = [];
      const stopMonitoring = startMonitoring(card, monitor, (f) => {
        failures.push(f);
      });

      // Wait for a few checks
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Trigger a failure
      card.setShouldFail(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      stopMonitoring();

      expect(monitor.failureHistory.length).toBeGreaterThan(0);
      expect(failures.length).toBeGreaterThan(0);
      expect(monitor.active).toBe(false);
    });

    it("should calculate health statistics", async () => {
      const card = new MockCard();
      const monitor = createHealthMonitor(card, 50);
      
      const stopMonitoring = startMonitoring(card, monitor);

      // Let it run for a bit
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Trigger failures
      card.setShouldFail(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      stopMonitoring();

      const stats = getHealthStats(monitor);
      expect(stats.totalChecks).toBeGreaterThan(0);
      expect(stats.failureRate).toBeGreaterThan(0);
      expect(stats.failureRate).toBeLessThanOrEqual(1);
    });
  });

  describe("Registry Validation", () => {
    it("should validate registry entries", () => {
      const issues = validateRegistry();

      // Issues will depend on current registry state
      // Just check that it returns an array
      expect(Array.isArray(issues)).toBe(true);
    });
  });
});
