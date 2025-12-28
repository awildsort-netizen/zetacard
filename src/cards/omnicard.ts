/**
 * ζ-Card: Omnicard (ζ.card.omni)
 *
 * The zero-dimensional attractor card: system overview, index, recents, and health.
 * Always resolvable. Always renderable.
 */

import {
  ZetaCardContract,
  CardMeta,
  CardFailure,
  CardActivationContext,
} from "../cardContract";

export type OmnicardState = {
  query: string;
  recentCards: string[]; // recent card IDs
  selectedIndex: number;
  isOpen: boolean;
};

export class Omnicard implements ZetaCardContract<OmnicardState> {
  readonly id = "ζ.card.omni";
  readonly meta: CardMeta = {
    title: "Omnicard",
    description: "System overview, semantic index, and invocation interface",
    tags: ["system", "attractor", "index"],
  };

  readonly zeta = [1, 0, 0]; // identity: fully resolved, no uncertainty

  private state: OmnicardState;
  private _isActive: boolean = false;
  private onActivate?: (ctx?: CardActivationContext) => void;

  constructor() {
    this.state = {
      query: "",
      recentCards: [],
      selectedIndex: 0,
      isOpen: true,
    };
  }

  /**
   * Get current state snapshot.
   */
  getState(): OmnicardState {
    return { ...this.state };
  }

  /**
   * Restore state from snapshot.
   */
  setState(next: OmnicardState): void {
    this.state = { ...next };
  }

  /**
   * Activation: become the active card.
   */
  activate(ctx?: CardActivationContext): void {
    this._isActive = true;
    this.state.isOpen = true;
    if (this.onActivate) {
      this.onActivate(ctx);
    }
    console.log(`[${this.id}] activated`, ctx);
  }

  /**
   * Deactivate (UI may call this for UX, but the contract is about activation).
   */
  deactivate(): void {
    this._isActive = false;
  }

  /**
   * Check if active.
   */
  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Omnibox semantic operator: resolve a query to a card ID or return null.
   * In a full system, this would query the registry.
   */
  select(query: string): string | null {
    // For now, simple heuristic: assume query is a card ID fragment
    // A real implementation would search the registry
    if (query.startsWith("ζ.card")) {
      return query;
    }
    return null;
  }

  /**
   * Add to recents.
   */
  addRecent(cardId: string): void {
    const recents = this.state.recentCards;
    const idx = recents.indexOf(cardId);
    if (idx >= 0) {
      recents.splice(idx, 1);
    }
    recents.unshift(cardId);
    if (recents.length > 10) {
      recents.pop();
    }
  }

  /**
   * Introspection: Omnicard should always be healthy.
   */
  getFailures(): CardFailure[] {
    return []; // Omnicard is always resolvable
  }

  /**
   * Register an activation callback (optional).
   * The router can use this to reflect activation into the URL.
   */
  setOnActivationChange(cb: (ctx?: CardActivationContext) => void): void {
    this.onActivate = cb;
  }

  /**
   * Update query string (e.g., from Omnibox input).
   */
  setQuery(q: string): void {
    this.state.query = q;
  }

  /**
   * Get current query.
   */
  getQuery(): string {
    return this.state.query;
  }
}
