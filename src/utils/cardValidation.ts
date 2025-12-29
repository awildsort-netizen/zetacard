/**
 * Card Validation Utilities
 * 
 * Runtime validation and health checks for cards implementing ZetaCardContract.
 * These utilities help ensure cards maintain their contracts and discover issues early.
 */

import {
  ZetaCardContract,
  CardFailure,
  validateCardContract,
  validateGradientInvariant,
  ZetaGradientCardContract,
} from "../cardContract";
import { CardRegistry } from "../cardRegistry";

// ============================================================================
// Validation Results
// ============================================================================

export interface ValidationResult {
  cardId: string;
  passed: boolean;
  failures: CardFailure[];
  warnings: string[];
  checks: CheckResult[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: "error" | "warn" | "info";
}

// ============================================================================
// Card Validation Suite
// ============================================================================

/**
 * Run comprehensive validation on a card.
 * Checks contract compliance, registry consistency, and runtime health.
 */
export function validateCard(card: ZetaCardContract): ValidationResult {
  const checks: CheckResult[] = [];
  const warnings: string[] = [];

  // 1. Contract validation
  const contractFailures = validateCardContract(card);
  checks.push({
    name: "Contract Compliance",
    passed: contractFailures.length === 0,
    message: contractFailures.length === 0
      ? "Card implements ZetaCardContract correctly"
      : `Found ${contractFailures.length} contract violation(s)`,
    severity: contractFailures.length === 0 ? "info" : "error",
  });

  // 2. Registry validation
  const registryEntry = CardRegistry[card.id];
  checks.push({
    name: "Registry Entry",
    passed: !!registryEntry,
    message: registryEntry
      ? "Card is registered in CardRegistry"
      : "Card is not registered (add to CardRegistry)",
    severity: registryEntry ? "info" : "error",
  });

  // 3. State immutability check
  try {
    const state1 = card.getState();
    const state2 = card.getState();
    const immutable = state1 !== state2; // Should be different references
    
    checks.push({
      name: "State Immutability",
      passed: immutable,
      message: immutable
        ? "getState() returns new object (immutable)"
        : "getState() returns same reference (mutability risk)",
      severity: immutable ? "info" : "warn",
    });

    if (!immutable) {
      warnings.push("State mutations may cause unexpected behavior");
    }
  } catch (error) {
    checks.push({
      name: "State Immutability",
      passed: false,
      message: `getState() threw error: ${error}`,
      severity: "error",
    });
  }

  // 4. Metadata completeness
  const hasTitle = card.meta.title && card.meta.title.length > 0;
  const hasDescription = card.meta.description && card.meta.description.length > 0;
  checks.push({
    name: "Metadata Completeness",
    passed: hasTitle && hasDescription,
    message: hasTitle && hasDescription
      ? "Metadata is complete"
      : "Missing title or description",
    severity: hasTitle ? "warn" : "error",
  });

  // 5. Failure mode introspection
  const hasFailureMethod = typeof card.getFailures === "function";
  checks.push({
    name: "Failure Introspection",
    passed: hasFailureMethod,
    message: hasFailureMethod
      ? "Card implements getFailures()"
      : "Card does not implement getFailures() (optional but recommended)",
    severity: hasFailureMethod ? "info" : "warn",
  });

  // 6. Current failure state
  if (hasFailureMethod) {
    const currentFailures = card.getFailures?.() || [];
    const hasErrors = currentFailures.some(f => f.severity === "error");
    
    checks.push({
      name: "Current Health",
      passed: !hasErrors,
      message: hasErrors
        ? `Card has ${currentFailures.filter(f => f.severity === "error").length} error(s)`
        : `Card is healthy (${currentFailures.length} total failures)`,
      severity: hasErrors ? "error" : "info",
    });
  }

  // 7. Gradient invariant (if applicable)
  const gradCard = card as ZetaGradientCardContract<unknown>;
  if (gradCard.potentialField && gradCard.gradient) {
    const gradientFailures = validateGradientInvariant(card);
    checks.push({
      name: "Gradient Invariant",
      passed: gradientFailures.length === 0,
      message: gradientFailures.length === 0
        ? "Gradient invariant holds"
        : `Found ${gradientFailures.length} gradient violation(s)`,
      severity: gradientFailures.length === 0 ? "info" : "warn",
    });
  }

  // Aggregate results
  const allFailures = [
    ...contractFailures,
    ...(card.getFailures?.() || []),
  ];

  const passed = checks.every(c => c.severity !== "error" || c.passed);

  return {
    cardId: card.id,
    passed,
    failures: allFailures,
    warnings,
    checks,
  };
}

/**
 * Validate all cards in the registry.
 * Returns a summary of validation results.
 */
export function validateAllCards(): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  // We can't directly validate registry entries without instances
  // This would require a factory pattern or dependency injection
  // For now, return empty map with a note
  
  return results;
}

/**
 * Generate a validation report as formatted text.
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push(`Card Validation Report: ${result.cardId}`);
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push("");
  
  lines.push(`Overall: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);
  lines.push("");
  
  lines.push("Checks:");
  for (const check of result.checks) {
    const icon = check.passed ? "✓" : "✗";
    const severity = check.severity === "error" ? "ERROR" : check.severity === "warn" ? "WARN" : "INFO";
    lines.push(`  ${icon} [${severity}] ${check.name}: ${check.message}`);
  }
  
  if (result.failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    for (const failure of result.failures) {
      lines.push(`  - [${failure.severity || "info"}] ${failure.code}: ${failure.message}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  ! ${warning}`);
    }
  }
  
  lines.push("");
  lines.push(`═══════════════════════════════════════════════════════`);
  
  return lines.join("\n");
}

// ============================================================================
// Runtime Health Monitoring
// ============================================================================

export interface HealthMonitor {
  cardId: string;
  checkInterval: number; // milliseconds
  lastCheck: number;
  failureHistory: CardFailure[][];
  active: boolean;
}

/**
 * Create a health monitor that periodically checks a card.
 */
export function createHealthMonitor(
  card: ZetaCardContract,
  intervalMs: number = 1000
): HealthMonitor {
  const monitor: HealthMonitor = {
    cardId: card.id,
    checkInterval: intervalMs,
    lastCheck: Date.now(),
    failureHistory: [],
    active: false,
  };

  return monitor;
}

/**
 * Start monitoring a card's health.
 */
export function startMonitoring(
  card: ZetaCardContract,
  monitor: HealthMonitor,
  onFailure?: (failures: CardFailure[]) => void
): () => void {
  if (monitor.active) {
    console.warn(`Monitor for ${card.id} is already active`);
    return () => {}; // noop
  }

  monitor.active = true;

  const intervalId = setInterval(() => {
    const failures = card.getFailures?.() || [];
    monitor.lastCheck = Date.now();
    monitor.failureHistory.push(failures);

    // Keep history bounded
    if (monitor.failureHistory.length > 100) {
      monitor.failureHistory.shift();
    }

    // Notify on failures
    if (failures.length > 0 && onFailure) {
      onFailure(failures);
    }
  }, monitor.checkInterval);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    monitor.active = false;
  };
}

/**
 * Get health statistics from monitor history.
 */
export function getHealthStats(monitor: HealthMonitor): {
  totalChecks: number;
  failureRate: number;
  mostCommonFailures: Array<{ code: string; count: number }>;
} {
  const totalChecks = monitor.failureHistory.length;
  const checksWithFailures = monitor.failureHistory.filter(
    (h) => h.length > 0
  ).length;
  const failureRate = totalChecks > 0 ? checksWithFailures / totalChecks : 0;

  // Count failure codes
  const failureCounts = new Map<string, number>();
  for (const history of monitor.failureHistory) {
    for (const failure of history) {
      const count = failureCounts.get(failure.code) || 0;
      failureCounts.set(failure.code, count + 1);
    }
  }

  const mostCommonFailures = Array.from(failureCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalChecks,
    failureRate,
    mostCommonFailures,
  };
}

// ============================================================================
// Registry Consistency Checks
// ============================================================================

/**
 * Check if all registry entries are valid.
 */
export function validateRegistry(): Array<{
  entryId: string;
  issue: string;
  severity: "error" | "warn";
}> {
  const issues: Array<{ entryId: string; issue: string; severity: "error" | "warn" }> = [];

  for (const [id, entry] of Object.entries(CardRegistry)) {
    // Check ID consistency
    if (id !== entry.id) {
      issues.push({
        entryId: id,
        issue: `Registry key "${id}" does not match entry.id "${entry.id}"`,
        severity: "error",
      });
    }

    // Check required fields
    if (!entry.meta.title) {
      issues.push({
        entryId: id,
        issue: "Missing meta.title",
        severity: "error",
      });
    }

    if (!entry.implementationPath) {
      issues.push({
        entryId: id,
        issue: "Missing implementationPath",
        severity: "error",
      });
    }

    // Check documentation
    if (entry.invariants.length === 0) {
      issues.push({
        entryId: id,
        issue: "No invariants documented",
        severity: "warn",
      });
    }
  }

  return issues;
}
