import { describe, expect, it } from 'vitest';
import { formatDay, formatFull, formatShort, formatWhen } from '@/lib/format';

const now = new Date('2026-11-06T15:00:00Z');

describe('formatWhen', () => {
  it('shows only the time for today, in Paris time', () => {
    expect(formatWhen('2026-11-06T13:02:00Z', now)).toBe('14:02');
  });
  it('adds the day otherwise', () => {
    expect(formatWhen('2026-11-04T08:30:00Z', now)).toBe('4 nov. 09:30');
  });
  it('adds the year for another year', () => {
    expect(formatWhen('2025-11-27T20:25:00Z', now)).toBe('27 nov. 2025 21:25');
  });
});

describe('formatDay', () => {
  it('leaves the year out for the current year only', () => {
    expect(formatDay('2026-03-14T10:00:00Z', now)).toBe('14 mars');
    expect(formatDay('2025-12-21T10:00:00Z', now)).toBe('21 déc. 2025');
  });
});

describe('formatShort', () => {
  it('reads like a list date', () => {
    expect(formatShort('2026-11-06T08:05:00Z', now)).toBe('09:05');
    expect(formatShort('2026-11-05T22:30:00Z', now)).toBe('hier');
    expect(formatShort('2026-10-02T10:00:00Z', now)).toBe('2 oct.');
  });
  it('counts days in Paris time, not UTC', () => {
    expect(formatShort('2026-11-05T23:30:00Z', now)).toBe('00:30');
  });
});

describe('formatFull', () => {
  it('spells the whole date', () => {
    expect(formatFull('2026-11-06T13:02:00Z')).toBe('vendredi 6 novembre 2026 à 14:02');
  });
});
