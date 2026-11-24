import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import postgres from 'postgres';
import { e2eEnv } from './env';

async function idOf(
  table: 'notes' | 'folders',
  column: string,
  value: string,
  userId: string,
): Promise<string> {
  const sql = postgres(e2eEnv.DATABASE_URL ?? '', { max: 1 });
  try {
    const [row] = await sql<
      { id: string }[]
    >`select id from ${sql(table)} where user_id = ${userId} and ${sql(column)} = ${value} limit 1`;
    if (!row) throw new Error(`${value} not found`);
    return row.id;
  } finally {
    await sql.end();
  }
}

const PAGES: { name: string; path: (userId: string) => Promise<string> }[] = [
  { name: 'writing page', path: async () => './' },
  { name: 'recent notes', path: async () => './dossiers/recents' },
  {
    name: 'folder with an open note',
    path: async (userId) =>
      `./dossiers/${await idOf('folders', 'name', 'TCP-IP', userId)}?note=${await idOf('notes', 'title', 'Adressage IPv4 et masques', userId)}`,
  },
  {
    name: 'search with filters',
    path: async () => './recherche?q=réseau&tag=réseau&periode=annee',
  },
  { name: 'empty search', path: async () => './recherche' },
  { name: 'settings', path: async () => './reglages' },
  { name: 'trash', path: async () => './dossiers/corbeille' },
];

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${scheme}`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
    for (const entry of PAGES) {
      test(`${entry.name} has no WCAG A or AA violation`, async ({ page, account }) => {
        await page.goto(await entry.path(account.id));
        expect(await audit(page)).toEqual([]);
      });
    }
  });
}

test('the folder menu and the move dialog have no violation', async ({ page, account }) => {
  await page.goto(`./dossiers/${await idOf('folders', 'name', 'TCP-IP', account.id)}`);
  await page.getByRole('button', { name: 'Actions sur TCP-IP' }).last().click();
  expect(await audit(page)).toEqual([]);
  await page.getByRole('menuitem', { name: 'Déplacer vers…' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await audit(page)).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('tree chevrons and menus do not move', async ({ page }) => {
    await page.goto('./dossiers/recents');
    const chevron = page.locator('.tree-toggle svg').first();
    expect(await chevron.evaluate((node) => getComputedStyle(node).transitionDuration)).toBe('0s');
  });
});
