import { describe, expect, it } from 'vitest';
import { plainExcerpt, withoutLeadingTitle } from '@/lib/markdown-text';
import { previewOf } from '@/server/entry-view';
import { RateLimiter } from '@/server/rate-limit';

describe('previewOf', () => {
  it('takes the first non-empty line without markdown markers', () => {
    expect(previewOf('\n\n# Cours de réseau\n\nLe modèle OSI')).toBe('Cours de réseau');
    expect(previewOf('- lait\n- œufs')).toBe('lait');
  });

  it('shortens long lines', () => {
    const preview = previewOf('a'.repeat(300));
    expect(preview.length).toBe(140);
    expect(preview.endsWith('…')).toBe(true);
  });
});

describe('RateLimiter', () => {
  it('refuses requests past the limit inside the window, then allows again', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow('u', 0)).toBe(true);
    expect(limiter.allow('u', 10)).toBe(true);
    expect(limiter.allow('u', 20)).toBe(false);
    expect(limiter.allow('other', 20)).toBe(true);
    expect(limiter.allow('u', 1011)).toBe(true);
  });
});

describe('withoutLeadingTitle', () => {
  it('drops a first heading that repeats the title', () => {
    expect(withoutLeadingTitle('# Modèle OSI\n\nSept couches.', 'Modèle OSI')).toBe(
      'Sept couches.',
    );
    expect(withoutLeadingTitle('## modèle osi\nSept', 'Modèle OSI')).toBe('Sept');
  });
  it('keeps other content', () => {
    expect(withoutLeadingTitle('# Autre\n\nTexte', 'Modèle OSI')).toBe('# Autre\n\nTexte');
    expect(withoutLeadingTitle('Texte', 'Modèle OSI')).toBe('Texte');
  });
});

describe('plainExcerpt', () => {
  it('removes Markdown markers but keeps highlight markers and words', () => {
    expect(
      plainExcerpt('# Modèle \u0001OSI\u0002\n\n- **TCP** est fiable\n| a | b |\n|---|---|'),
    ).toBe('Modèle \u0001OSI\u0002 TCP est fiable a b');
    expect(plainExcerpt('voir [la doc](https://example.com)')).toBe('voir la doc');
  });
});
