import { describe, expect, it } from 'vitest';
import { computeHandLayout } from '../handLayout';

describe('Player Hand Responsive Dynamic Layout & Scaling', () => {
  const desktopWidth = 840;
  const tabletWidth = 640;
  const mobileWidth = 360;

  describe('1. Two-Card Special Display (Large with comfortable spacing)', () => {
    it('renders 2 cards large and clearly with positive comfortable spacing on desktop', () => {
      const layout = computeHandLayout(2, desktopWidth, false);

      expect(layout.cardWidth).toBe(112); // Maximum large card width
      expect(layout.cardHeight).toBeGreaterThan(150);
      expect(layout.gap).toBeGreaterThanOrEqual(16); // Comfortable spacing
      expect(layout.overlap).toBe(0); // Zero overlap!
      expect(layout.totalWidth).toBeLessThanOrEqual(desktopWidth);
    });

    it('renders 2 cards comfortably spaced without overlap on mobile', () => {
      const layout = computeHandLayout(2, mobileWidth, true);

      expect(layout.cardWidth).toBe(84); // Maximum mobile card width
      expect(layout.gap).toBeGreaterThanOrEqual(10);
      expect(layout.overlap).toBe(0);
      expect(layout.totalWidth).toBeLessThanOrEqual(mobileWidth);
    });
  });

  describe('2. Hand Scaling and Non-Overflow across Hand Sizes (5, 10, 15, 20+ cards)', () => {
    const cardCounts = [2, 5, 10, 15, 20, 25];

    cardCounts.forEach((count) => {
      it(`fits ${count} cards on desktop (${desktopWidth}px) without overflowing`, () => {
        const layout = computeHandLayout(count, desktopWidth, false);

        expect(layout.totalWidth).toBeLessThanOrEqual(desktopWidth);
        expect(layout.cardWidth).toBeGreaterThanOrEqual(56); // Respects minimum desktop card size
        expect(layout.cardWidth).toBeLessThanOrEqual(112); // Respects maximum desktop card size
        expect(layout.cardHeight).toBe(Math.round(layout.cardWidth * 1.42));

        if (count >= 15) {
          // With 15+ cards, overlap is utilized while keeping corner index exposed
          expect(layout.step).toBeGreaterThanOrEqual(20);
        }
      });

      it(`fits ${count} cards on mobile (${mobileWidth}px) without overflowing`, () => {
        const layout = computeHandLayout(count, mobileWidth, true);

        expect(layout.totalWidth).toBeLessThanOrEqual(mobileWidth);
        expect(layout.cardWidth).toBeGreaterThanOrEqual(44); // Respects minimum mobile card size
        expect(layout.cardWidth).toBeLessThanOrEqual(84); // Respects maximum mobile card size

        if (count >= 10) {
          expect(layout.overlap).toBeGreaterThan(0);
        }
      });
    });

    it('smoothly reduces card dimensions as card count increases', () => {
      const layout2 = computeHandLayout(2, desktopWidth, false);
      const layout5 = computeHandLayout(5, desktopWidth, false);
      const layout10 = computeHandLayout(10, desktopWidth, false);
      const layout15 = computeHandLayout(15, desktopWidth, false);
      const layout20 = computeHandLayout(20, desktopWidth, false);

      expect(layout2.cardWidth).toBeGreaterThanOrEqual(layout5.cardWidth);
      expect(layout5.cardWidth).toBeGreaterThanOrEqual(layout10.cardWidth);
      expect(layout10.cardWidth).toBeGreaterThanOrEqual(layout15.cardWidth);
      expect(layout15.cardWidth).toBeGreaterThanOrEqual(layout20.cardWidth);
    });
  });

  describe('3. Tablet and Responsive Container Adaptation', () => {
    it('adapts step size appropriately for intermediate tablet widths', () => {
      const layout10Tablet = computeHandLayout(10, tabletWidth, false);
      const layout10Desktop = computeHandLayout(10, desktopWidth, false);

      expect(layout10Tablet.totalWidth).toBeLessThanOrEqual(tabletWidth);
      expect(layout10Desktop.totalWidth).toBeLessThanOrEqual(desktopWidth);
      expect(layout10Tablet.step).toBeLessThanOrEqual(layout10Desktop.step);
    });
  });
});
