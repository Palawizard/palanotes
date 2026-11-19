import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test('a personal token is created, shown once, used by another app and revoked', async ({
  page,
  context,
  playwright,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./reglages');
  const section = page.getByRole('region', { name: 'Accès pour une autre app' });
  await expect(section.getByText('Aucun jeton pour l’instant.')).toBeVisible();

  await section.getByRole('button', { name: 'Créer un jeton' }).click();
  await expect(section.getByRole('alert')).toContainText('Donne un nom au jeton');

  await section.getByLabel('Nom du jeton').fill('Tableau de bord');
  await section.getByRole('button', { name: 'Créer un jeton' }).click();
  const reveal = section.getByRole('group', { name: 'Nouveau jeton « Tableau de bord »' });
  await expect(reveal).toContainText('Copie ce jeton maintenant : il ne sera plus affiché.');
  const token = (await reveal.locator('code').textContent()) ?? '';
  expect(token).toMatch(/^pn_[A-Za-z0-9_-]{43}$/);
  await expect(reveal.getByRole('button', { name: 'Copier' })).toBeFocused();

  await reveal.getByRole('button', { name: 'Copier' }).click();
  await expect(reveal.getByRole('button', { name: 'Copié' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(token);

  const list = section.getByRole('list', { name: 'Jetons' });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Jamais utilisé');

  // The session cookie of this page is not enough on these routes: only the token is.
  const withCookie = await page.request.get('api/v1/notes');
  expect(withCookie.status()).toBe(401);
  expect(await withCookie.json()).toEqual({ error: 'unauthorized' });

  const auth = { authorization: `Bearer ${token}` };
  const notes = await page.request.get('api/v1/notes?limit=3', { headers: auth });
  expect(notes.status()).toBe(200);
  const body = (await notes.json()) as { notes: { path: string; folderPath: string }[] };
  expect(body.notes).toHaveLength(3);
  expect(body.notes[0]?.path).toMatch(/^\/notes\/dossiers\/[0-9a-f-]{36}\?note=[0-9a-f-]{36}$/);
  await page.goto(body.notes[0]?.path.replace(/^\/notes\//, './') ?? '');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  // The token opens nothing outside /api/v1, even from the app's own origin.
  const outside = await playwright.request.newContext({ baseURL });
  const appRoute = await outside.post('api/entries', {
    headers: { ...auth, origin: new URL(baseURL ?? '').origin },
    data: { content: 'Envoyée sur une route de l’app' },
  });
  expect(appRoute.status()).toBe(401);
  await outside.dispose();

  const search = await page.request.get(`api/v1/search?q=${encodeURIComponent('réseau')}`, {
    headers: auth,
  });
  expect(search.status()).toBe(200);
  expect(((await search.json()) as { notes: unknown[] }).notes.length).toBeGreaterThan(0);

  const entry = await page.request.post('api/v1/entries', {
    headers: auth,
    data: { content: 'Envoyée par le tableau de bord' },
  });
  expect(entry.status()).toBe(201);
  await page.goto('./');
  await expect(page.getByText('Envoyée par le tableau de bord')).toBeVisible();

  // Shown once: after a reload only the name and the dates remain.
  await page.goto('./reglages');
  await expect(section.locator('code')).toHaveCount(0);
  await expect(page.getByText(token)).toHaveCount(0);
  await expect(list).toContainText('Utilisé le');

  await list.getByRole('button', { name: 'Révoquer « Tableau de bord »' }).click();
  const dialog = page.getByRole('dialog', { name: 'Révoquer ce jeton' });
  await expect(dialog).toContainText('n’aura plus accès à tes notes');
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);

  await list.getByRole('button', { name: 'Révoquer « Tableau de bord »' }).click();
  await dialog.getByRole('button', { name: 'Révoquer' }).click();
  await expect(section.getByText('Aucun jeton pour l’instant.')).toBeVisible();
  await expect(section.getByLabel('Nom du jeton')).toBeFocused();

  const revoked = await page.request.get('api/v1/notes', { headers: auth });
  expect(revoked.status()).toBe(401);
});

test('an eleventh token is refused with a way out', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  await page.goto('./reglages');
  const created: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const response = await page.request.post('api/tokens', {
      headers: { origin },
      data: { name: `Jeton ${index}` },
    });
    expect(response.status()).toBe(201);
    created.push(((await response.json()) as { record: { id: string } }).record.id);
  }
  await page.reload();
  const section = page.getByRole('region', { name: 'Accès pour une autre app' });
  await expect(section.getByRole('list', { name: 'Jetons' }).getByRole('listitem')).toHaveCount(10);
  await section.getByLabel('Nom du jeton').fill('Un de trop');
  await section.getByRole('button', { name: 'Créer un jeton' }).click();
  await expect(section.getByRole('alert')).toHaveText(
    'Tu as déjà 10 jetons : révoque-en un avant d’en créer un autre.',
  );
  await expect(section.locator('code')).toHaveCount(0);

  for (const id of created) {
    expect((await page.request.delete(`api/tokens/${id}`, { headers: { origin } })).status()).toBe(
      204,
    );
  }
});
