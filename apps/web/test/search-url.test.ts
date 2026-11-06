import { describe, expect, it } from 'vitest';
import { parseSearch, periodStart, safeReturn, searchHref } from '@/lib/search-url';

const folder = '6f1c2a3b-1111-4222-8333-444455556666';

describe('parseSearch', () => {
  it('reads the query and every filter', () => {
    expect(
      parseSearch({
        q: ' réseau ',
        dossier: folder,
        sous: '0',
        tag: ['dns', 'tcp'],
        periode: 'mois',
      }),
    ).toEqual({
      q: 'réseau',
      folder,
      sub: false,
      tags: ['dns', 'tcp'],
      period: 'mois',
      shown: 30,
    });
  });

  it('drops malformed values', () => {
    const state = parseSearch({
      dossier: '../etc',
      periode: 'siecle',
      tag: ['', 'x'.repeat(41)],
      n: 'abc',
    });
    expect(state).toMatchObject({ folder: null, period: null, tags: [], shown: 30, sub: true });
  });

  it('rounds the number of results to whole pages', () => {
    expect(parseSearch({ n: '45' }).shown).toBe(60);
    expect(parseSearch({ n: '5000' }).shown).toBe(200);
  });
});

describe('searchHref', () => {
  const state = parseSearch({
    q: 'osi',
    dossier: folder,
    tag: 'réseau',
    periode: 'semaine',
    n: '60',
  });

  it('writes the filters into the address and starts again from the first page', () => {
    expect(searchHref(state)).toBe(
      `/recherche?q=osi&dossier=${folder}&tag=r%C3%A9seau&periode=semaine`,
    );
  });

  it('removes one filter at a time', () => {
    expect(searchHref(state, { tags: [] })).toBe(
      `/recherche?q=osi&dossier=${folder}&periode=semaine`,
    );
    expect(searchHref(state, { folder: null, period: null })).toBe(
      '/recherche?q=osi&tag=r%C3%A9seau',
    );
  });

  it('keeps « without subfolders » only with a folder', () => {
    expect(searchHref(state, { sub: false })).toContain('sous=0');
    expect(searchHref(state, { folder: null, sub: false })).not.toContain('sous');
  });
});

describe('periodStart', () => {
  it('counts days back from now', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(periodStart('semaine', now)?.toISOString()).toBe('2026-10-30T12:00:00.000Z');
    expect(periodStart(null, now)).toBeNull();
  });
});

describe('safeReturn', () => {
  it('only accepts the search page', () => {
    expect(safeReturn('/recherche?q=osi')).toBe('/recherche?q=osi');
    expect(safeReturn('https://evil.example')).toBeNull();
    expect(safeReturn('//evil.example/recherche')).toBeNull();
    expect(safeReturn(undefined)).toBeNull();
  });
});
