import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import postgres from 'postgres';
import { e2eEnv } from '../env';

// Measures the heaviest screens with the demo account: run with the screenshots
// (`pnpm --filter @palanotes/web screens`); results go to SCREENS_DIR/perf.json.
const OUT = process.env.SCREENS_DIR ?? join(import.meta.dirname, '../../test-results/screens');

async function folderId(name: string): Promise<string> {
  const sql = postgres(e2eEnv.DATABASE_URL ?? '', { max: 1 });
  try {
    const [row] = await sql<{ id: string }[]>`select id from folders where name = ${name} limit 1`;
    return row?.id ?? '';
  } finally {
    await sql.end();
  }
}

test('performance with the demo account', async ({ browser }) => {
  const journal = await folderId('Journal');
  const pages = [
    { name: 'récents', path: './dossiers/recents' },
    { name: 'dossier Journal (50 notes)', path: `./dossiers/${journal}` },
    { name: 'dossier Journal (70 notes)', path: `./dossiers/${journal}?n=100` },
    { name: 'recherche « réseau »', path: './recherche?q=réseau' },
    { name: 'recherche filtrée', path: './recherche?q=réseau&tag=réseau&periode=annee' },
  ];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('./dossiers/recents');
  const results: Record<string, unknown>[] = [];
  for (const entry of pages) {
    const runs: { server: number; dom: number; nodes: number }[] = [];
    for (let run = 0; run < 5; run += 1) {
      await page.goto(entry.path, { waitUntil: 'load' });
      runs.push(
        await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            server: Math.round(nav.responseStart - nav.requestStart),
            dom: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            nodes: document.getElementsByTagName('*').length,
          };
        }),
      );
    }
    const median = (key: 'server' | 'dom' | 'nodes') =>
      runs.map((value) => value[key]).sort((a, b) => a - b)[2];
    results.push({
      page: entry.name,
      serverMs: median('server'),
      domContentLoadedMs: median('dom'),
      domNodes: median('nodes'),
    });
  }

  // Tree: 40 arrow presses, timed until the focus has moved and a frame has painted.
  await page.goto('./dossiers/recents');
  await page.evaluate(() => {
    (window as unknown as { longTasks: number }).longTasks = 0;
    new PerformanceObserver((list) => {
      (window as unknown as { longTasks: number }).longTasks += list.getEntries().length;
    }).observe({ type: 'longtask', buffered: false });
  });
  const tree = page.getByRole('tree');
  for (const name of ['Cours', 'Perso', 'Projets']) {
    await tree
      .getByRole('treeitem', { name: new RegExp(`^${name}(?: \\d+)?$`) })
      .locator('.tree-toggle')
      .click();
  }
  await tree.getByRole('treeitem').first().focus();
  const durations: number[] = [];
  for (let step = 0; step < 40; step += 1) {
    const start = await page.evaluate(() => performance.now());
    await page.keyboard.press('ArrowDown');
    const end = await page.evaluate(
      () =>
        new Promise<number>((resolve) => requestAnimationFrame(() => resolve(performance.now()))),
    );
    durations.push(end - start);
  }
  durations.sort((a, b) => a - b);
  results.push({
    page: 'arbre au clavier (40 flèches, dossiers ouverts)',
    visibleItems: await tree.getByRole('treeitem').count(),
    medianStepMs: Math.round(durations[20] ?? 0),
    worstStepMs: Math.round(durations.at(-1) ?? 0),
    longTasks: await page.evaluate(() => (window as unknown as { longTasks: number }).longTasks),
  });
  await context.close();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'perf.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
});
