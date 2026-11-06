import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { e2eEnv } from '../env';

const OUT = process.env.SCREENS_DIR ?? join(import.meta.dirname, '../../test-results/screens');
const WIDTHS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '390', width: 390, height: 844 },
] as const;
const THEMES = ['light', 'dark'] as const;

async function idOf(table: 'notes' | 'folders', column: string, value: string): Promise<string> {
  const sql = postgres(e2eEnv.DATABASE_URL ?? '', { max: 1 });
  try {
    const [row] = await sql<
      { id: string }[]
    >`select id from ${sql(table)} where ${sql(column)} = ${value} limit 1`;
    if (!row) throw new Error(`${table}.${column} = ${value} not found`);
    return row.id;
  } finally {
    await sql.end();
  }
}

interface Screen {
  name: string;
  path: () => Promise<string>;
  prepare?: (page: Page) => Promise<void>;
  fullPage?: boolean;
}

const SCREENS: Screen[] = [
  { name: 'ecrire', path: async () => './' },
  {
    name: 'pochette',
    path: async () => './',
    prepare: async (page) => {
      const row = page.getByRole('region', { name: 'Pochette' }).getByRole('button').first();
      await row.click();
      await row.scrollIntoViewIfNeeded();
    },
  },
  { name: 'dossiers', path: async () => './dossiers', fullPage: true },
  {
    name: 'dossier',
    path: async () => `./dossiers/${await idOf('folders', 'name', 'TCP-IP')}`,
    fullPage: true,
  },
  {
    name: 'note',
    path: async () => `./note/${await idOf('notes', 'title', 'Adressage IPv4 et masques')}`,
  },
  {
    name: 'note-longue',
    path: async () =>
      `./note/${await idOf('notes', 'title', 'Synthèse de révision : réseau, semestre 1')}`,
    fullPage: true,
  },
  { name: 'recherche-vide', path: async () => './recherche' },
  { name: 'recherche', path: async () => './recherche?q=réseau', fullPage: true },
  { name: 'recherche-rien', path: async () => './recherche?q=ornithorynque' },
  { name: 'reglages', path: async () => './reglages' },
];

test('screens', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  for (const theme of THEMES) {
    for (const size of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        colorScheme: theme,
        deviceScaleFactor: 1,
        hasTouch: size.width < 600,
        isMobile: size.width < 600,
      });
      const page = await context.newPage();
      for (const screen of SCREENS) {
        await page.goto(await screen.path());
        await page.waitForLoadState('networkidle');
        await screen.prepare?.(page);
        await page.screenshot({
          path: join(OUT, `${screen.name}-${size.name}-${theme}.png`),
          fullPage: screen.fullPage ?? false,
          animations: 'disabled',
        });
      }
      await context.close();
    }
  }
});
