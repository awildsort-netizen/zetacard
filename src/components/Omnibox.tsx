import React, { useEffect, useRef, useState } from 'react';
import { listCards, CardRegistryEntry, type CardQueryResult } from '../cardRegistry';
import { eventLog } from '../instrumentation';

interface OmniboxProps {
  onInvoke?: (id: string, mode: 'SafeRun' | 'Run', card: CardQueryResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Omnibox: Semantic invocation interface.
 *
 * Uses CardRegistry directly.
 * Activates cards by semantic reference, not search.
 */

/**
 * Convert CardRegistryEntry to CardQueryResult format
 */
function toCardQueryResult(card: CardRegistryEntry): CardQueryResult {
  return {
    manifest: {
      title: card.meta.title,
      tagline: card.meta.description,
      semanticDescriptor: card.docstring || '',
      description: card.meta.description,
      tags: card.meta.tags,
    },
    score: 1.0,
  };
}

export default function Omnibox({ onInvoke, open: externalOpen, onOpenChange }: OmniboxProps) {
  const [localOpen, setLocalOpen] = useState(true);
  const open = externalOpen !== undefined ? externalOpen : localOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setLocalOpen(value);
    }
  };

  const [q, setQ] = useState('');
  const [results, setResults] = useState<CardRegistryEntry[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Simple semantic search: match query against card ID and metadata.
   */
  const searchCards = (query: string): CardRegistryEntry[] => {
    if (!query.trim()) {
      return listCards();
    }

    const lq = query.toLowerCase();
    const scored = listCards()
      .map((card) => {
        let score = 0;

        // Exact ID match is highest priority
        if (card.id.toLowerCase() === lq) {
          score += 1000;
        }

        // ID substring
        if (card.id.toLowerCase().includes(lq)) {
          score += 100;
        }

        // Title match
        if (card.meta.title.toLowerCase().includes(lq)) {
          score += 50;
        }

        // Description match
        if (card.meta.description?.toLowerCase().includes(lq)) {
          score += 25;
        }

        // Tag match
        if (card.meta.tags?.some((t) => t.toLowerCase().includes(lq))) {
          score += 10;
        }

        return { card, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.card);

    return scored;
  };

  useEffect(() => {
    const results = searchCards(q);
    setResults(results);
    setSel(0);

    if (q) {
      const flowId = eventLog.startFlow();
      eventLog.emit({ type: 'SEARCH_QUERY', query: q, flowId });
    }
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[sel];
        if (r) {
          handleActivateCard(r, 'Run');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, sel]);

  const handleActivateCard = (card: CardRegistryEntry, mode: 'SafeRun' | 'Run') => {
    if (!card) return;
    setOpen(false);

    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'CARD_SELECTED', cardId: card.id, cardTitle: card.meta.title, flowId });
    eventLog.emit({ type: 'CARD_OPENED', cardId: card.id, mode, flowId });

    // Convert CardRegistryEntry to CardQueryResult format expected by App
    const cardQueryResult = toCardQueryResult(card);

    // Notify parent
    onInvoke?.(card.id, mode, cardQueryResult);
  };

  return (
    <>
      {open ? (
        <>
          <div className={`omnibox-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden={!open} />
          <div
            data-testid="omnibox"
            className="omnibox"
            role="search"
            aria-label="Omnibox semantic interface"
            aria-expanded={open}
            style={{
              position: 'fixed',
              left: 12,
              top: 12,
              width: 680,
              background: '#111',
              color: '#fff',
              padding: 12,
              borderRadius: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type card ID or name (Ctrl+K)"
                aria-controls="omnibox-results"
                aria-label="Activate cards"
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #333',
                  background: '#0e0e0e',
                  color: '#fff',
                }}
              />
              <button
                aria-label="Activate selection"
                onClick={() => {
                  const r = results[sel];
                  if (r) handleActivateCard(r, 'Run');
                }}
                style={{ padding: '6px 10px' }}
              >
                Activate
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {/* Results list */}
              <div style={{ flex: '0 0 380px', maxHeight: 220, overflow: 'auto' }}>
                <div id="omnibox-results" role="listbox" aria-label="Card results">
                  {results.map((card, i) => (
                    <div
                      key={card.id}
                      role="option"
                      aria-selected={i === sel}
                      tabIndex={0}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => handleActivateCard(card, 'Run')}
                      style={{
                        padding: 8,
                        background: i === sel ? 'rgba(255,255,255,0.04)' : 'transparent',
                        borderRadius: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{card.meta.title}</div>
                        <div style={{ fontSize: 12, color: '#bbb' }}>{card.meta.description}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          ID: {card.id} • {card.meta.tags?.join(', ') || 'no tags'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {results.length === 0 && <div style={{ color: '#777', padding: 8 }}>No cards match</div>}
              </div>

              {/* Preview */}
              <div style={{ flex: 1, background: '#0b0b0b', padding: 10, borderRadius: 6, border: '1px solid #202020' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Card Details</div>
                {results[sel] ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{results[sel].meta.title}</div>
                    <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>{results[sel].meta.description}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 8, fontFamily: 'monospace' }}>
                      {results[sel].id}
                    </div>
                    {results[sel].invariants && results[sel].invariants.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#ccc' }}>Invariants:</div>
                        <ul style={{ fontSize: 11, color: '#aaa', marginTop: 4, paddingLeft: 16 }}>
                          {results[sel].invariants.slice(0, 2).map((inv, i) => (
                            <li key={i}>{inv.split(':')[0]}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {results[sel].docstring && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                        {results[sel].docstring}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#666', marginTop: 8 }}>Select a card to preview</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

