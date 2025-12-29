/**
 * ζ-Card: README Card (ζ.card.readme)
 *
 * Self-healing documentation: introspects the card registry and validates README consistency.
 * Makes the README a *projection* of actual card state, not independent prose.
 *
 * Prevents hallucination and README drift.
 */

import {
  ZetaCardContract,
  CardMeta,
  CardFailure,
  CardActivationContext,
  CardFailureRegistry as _CardFailureRegistry,
} from "../cardContract";
import {
  CardRegistry,
  CardRegistryEntry,
  listCards,
  generateCardsSection,
  validateReadmeAgainstRegistry,
  ReadmeDriftIssue,
} from "../cardRegistry";

export type ReadmeCardState = {
  driftIssues: ReadmeDriftIssue[];
  lastValidation?: number;
  readmeContent?: string;
};

export class ReadmeCard implements ZetaCardContract<ReadmeCardState> {
  readonly id = "ζ.card.readme";
  readonly meta: CardMeta = {
    title: "README Card",
    description: "Self-healing documentation: introspects registry and validates README consistency",
    tags: ["system", "documentation", "validator"],
  };

  readonly zeta = [0.5, 0.5, 0]; // meta-card: partial introspection

  private state: ReadmeCardState;
  private _isActive: boolean = false;

  constructor() {
    this.state = {
      driftIssues: [],
      lastValidation: undefined,
      readmeContent: undefined,
    };
  }

  /**
   * Get current state snapshot.
   */
  getState(): ReadmeCardState {
    return { ...this.state };
  }

  /**
   * Restore state from snapshot.
   */
  setState(next: ReadmeCardState): void {
    this.state = { ...next };
  }

  /**
   * Activation: become the active card.
   */
  activate(ctx?: CardActivationContext): void {
    this._isActive = true;
    // Auto-validate on activation
    this.validate();
    console.log(`[${this.id}] activated and validating`, ctx);
  }

  /**
   * Check if active.
   */
  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Validate README against the current card registry.
   * Populates state.driftIssues with any inconsistencies.
   */
  validate(): void {
    if (!this.state.readmeContent) {
      this.state.driftIssues = [
        {
          type: "missing_card",
          cardId: "ζ.card.readme",
          message: "No README content loaded",
        },
      ];
      return;
    }

    this.state.driftIssues = validateReadmeAgainstRegistry(this.state.readmeContent);
    this.state.lastValidation = Date.now();
  }

  /**
   * Load README content for validation.
   * In a real system, this would read from the filesystem or fetch from a URL.
   */
  loadReadmeContent(content: string): void {
    this.state.readmeContent = content;
    this.validate();
  }

  /**
   * Generate the complete "ζ-Cards" section that should be in the README.
   */
  generateCardsSection(): string {
    return generateCardsSection();
  }

  /**
   * Get the registry entry for a specific card.
   */
  getCardEntry(cardId: string): CardRegistryEntry | null {
    return CardRegistry[cardId] || null;
  }

  /**
   * List all registered cards.
   */
  listAllCards(): CardRegistryEntry[] {
    return listCards();
  }

  /**
   * Introspection: surface README health.
   */
  getFailures?(): CardFailure[] {
    const failures: CardFailure[] = [];

    if (!this.state.readmeContent) {
      failures.push({
        code: "missing_card_docs",
        message: "README content not loaded for validation",
        severity: "warn",
      });
    }

    if (this.state.driftIssues.length > 0) {
      const missingCount = this.state.driftIssues.filter(
        (i) => i.type === "missing_card"
      ).length;

      if (missingCount > 0) {
        failures.push({
          code: "stale_docs",
          message: `README missing ${missingCount} card(s): ${this.state.driftIssues
            .filter((i) => i.type === "missing_card")
            .map((i) => i.cardId)
            .join(", ")}`,
          severity: "warn",
        });
      }
    }

    return failures;
  }

  /**
   * Summary view for the Omnicard.
   * Shows README health at a glance.
   */
  getSummary(): {
    cardCount: number;
    driftIssueCount: number;
    lastValidation: string | null;
    isHealthy: boolean;
  } {
    const failures = this.getFailures?.() || [];
    return {
      cardCount: listCards().length,
      driftIssueCount: this.state.driftIssues.length,
      lastValidation: this.state.lastValidation
        ? new Date(this.state.lastValidation).toISOString()
        : null,
      isHealthy: failures.length === 0,
    };
  }
}
