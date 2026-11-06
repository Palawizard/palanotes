import { describe, expect, it } from 'vitest';
import { parseTreeCookie, serializeTreeCookie } from '@/lib/tree-cookie';

const a = '6f1c2a3b-1111-4222-8333-444455556666';
const b = '7f1c2a3b-1111-4222-8333-444455556666';

describe('tree cookie', () => {
  it('round-trips folder ids', () => {
    expect(parseTreeCookie(serializeTreeCookie([a, b]))).toEqual([a, b]);
  });
  it('drops anything that is not an id', () => {
    expect(parseTreeCookie(`${a}.<script>.${b}`)).toEqual([a, b]);
    expect(parseTreeCookie(undefined)).toEqual([]);
  });
});
