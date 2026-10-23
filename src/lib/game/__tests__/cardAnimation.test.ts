import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isCardFlying, cancelCardFlight, launchCardPlayOverlay } from '../cardAnimation';

describe('cardAnimation', () => {
  beforeEach(() => {
    cancelCardFlight('c-1');
    cancelCardFlight('c-2');
  });

  it('reports isCardFlying as false initially', () => {
    expect(isCardFlying('c-1')).toBe(false);
  });

  it('does not launch overlay if sourceEl or discardEl is missing', () => {
    const result = launchCardPlayOverlay(null, 'c-1');
    expect(result).toBe(false);
    expect(isCardFlying('c-1')).toBe(false);
  });

  it('launches overlay and prevents duplicate animations for the same cardId in DOM environment', () => {
    const mockOverlay = {
      setAttribute: vi.fn(),
      style: {} as any,
      remove: vi.fn(),
    };

    const mockSource = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 50, top: 300, width: 80, height: 120 }),
      cloneNode: vi.fn().mockReturnValue(mockOverlay),
    } as unknown as HTMLElement;

    const mockDiscard = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 100, top: 100, width: 80, height: 120 }),
    } as unknown as HTMLElement;

    // Setup global document mock
    const originalDocument = (globalThis as any).document;
    (globalThis as any).document = {
      getElementById: (id: string) => (id === 'discard-pile-container' ? mockDiscard : null),
      querySelectorAll: vi.fn().mockReturnValue([mockOverlay]),
      body: {
        appendChild: vi.fn(),
      },
    };

    try {
      const started = launchCardPlayOverlay(mockSource, 'c-1');
      expect(started).toBe(true);
      expect(isCardFlying('c-1')).toBe(true);

      // Duplicate call for the same card while flying must be blocked
      const duplicateStarted = launchCardPlayOverlay(mockSource, 'c-1');
      expect(duplicateStarted).toBe(false);

      // cancelCardFlight clears the state and removes overlay element
      cancelCardFlight('c-1');
      expect(isCardFlying('c-1')).toBe(false);
      expect(mockOverlay.remove).toHaveBeenCalled();
    } finally {
      (globalThis as any).document = originalDocument;
    }
  });
});
