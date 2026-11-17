import { describe, expect, it } from 'vitest';
import { squarify, type Rect } from '@/lib/squarify';

const overlap = (a: Rect, b: Rect) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-9 &&
  Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-9;

describe('squarify', () => {
  // Note counts of the demo account's top-level folders.
  const counts = [159, 67, 42, 42, 26, 9];
  const rects = squarify(counts, 100, 60);
  const total = counts.reduce((sum, count) => sum + count, 0);

  it('gives each value an area proportional to it', () => {
    rects.forEach((rect, index) => {
      expect(rect.w * rect.h).toBeCloseTo(((counts[index] as number) / total) * 6000, 6);
    });
  });

  it('tiles the whole frame without overlap', () => {
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.x + rect.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(rect.y + rect.h).toBeLessThanOrEqual(60 + 1e-9);
    }
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
  });

  it('keeps blocks close to square', () => {
    for (const rect of rects) {
      expect(Math.max(rect.w / rect.h, rect.h / rect.w)).toBeLessThan(4);
    }
  });

  it('returns empty rectangles when there is nothing to draw', () => {
    expect(squarify([0, 0], 100, 60)).toEqual([
      { x: 0, y: 0, w: 0, h: 0 },
      { x: 0, y: 0, w: 0, h: 0 },
    ]);
    expect(squarify([5], 100, 60)).toEqual([{ x: 0, y: 0, w: 100, h: 60 }]);
  });
});
