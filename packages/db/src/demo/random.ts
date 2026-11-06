export interface Random {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  sample: <T>(items: readonly T[], count: number) => T[];
}

// mulberry32: small, fast and deterministic, so the demo account is the same on every load.
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error('cannot pick from an empty list');
    }
    return item;
  };
  const sample = <T>(items: readonly T[], count: number): T[] => {
    const pool = [...items];
    const out: T[] = [];
    while (out.length < count && pool.length > 0) {
      out.push(...pool.splice(int(0, pool.length - 1), 1));
    }
    return out;
  };
  return { next, int, pick, sample };
}
