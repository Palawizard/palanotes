import { describe, expect, it } from 'vitest';
import { formatWhen } from '@/lib/format';

describe('formatWhen', () => {
  const now = new Date('2026-11-06T15:00:00Z');
  it('shows only the time for today, in Paris time', () => {
    expect(formatWhen('2026-11-06T13:02:00Z', now)).toBe('14:02');
  });
  it('adds the day otherwise', () => {
    expect(formatWhen('2026-11-04T08:30:00Z', now)).toBe('4 nov. 09:30');
  });
});
