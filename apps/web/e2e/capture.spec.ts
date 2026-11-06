import { expect, test } from '@playwright/test';

test('writing an entry puts it in the pocket and keeps the raw text', async ({ page }) => {
  await page.goto('./');
  const input = page.getByLabel('Ta note');
  await expect(input).toBeFocused();

  await input.fill('Acheter du café\nà ranger avec les courses');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();

  const pocket = page.getByRole('region', { name: 'Pochette' });
  await expect(pocket.getByText('Acheter du café')).toBeVisible();
  await expect(input).toHaveValue('');

  await page.reload();
  await expect(pocket.getByText('Acheter du café')).toBeVisible();
});

test('ctrl+enter submits from the keyboard', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Ta note').fill('Idée envoyée au clavier');
  await page.keyboard.press('Control+Enter');
  await expect(
    page.getByRole('region', { name: 'Pochette' }).getByText('Idée envoyée au clavier'),
  ).toBeVisible();
});

test('an empty entry is refused with a message', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Écris quelque chose avant de valider.' }),
  ).toBeVisible();
});

test('a draft survives a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Ta note').fill('Brouillon à ne pas perdre');
  await page.reload();
  await expect(page.getByLabel('Ta note')).toHaveValue('Brouillon à ne pas perdre');
  await page.getByLabel('Ta note').fill('');
});

test('the api refuses an entry that is too long', async ({ page }) => {
  await page.goto('./');
  const status = await page.evaluate(async () => {
    const response = await fetch('/notes/api/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'x'.repeat(20_001) }),
    });
    return response.status;
  });
  expect(status).toBe(400);
});

test('the worker files an entry and the pocket shows it to review', async ({ page }) => {
  await page.goto('./');
  await page
    .getByLabel('Ta note')
    .fill('Le masque /26 donne 62 hôtes\nà ranger avec mes cours de réseau');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Le masque /26 donne 62 hôtes' });
  await expect(row.getByText('À valider')).toBeVisible({ timeout: 20_000 });
});

test('a proposal can be accepted, then undone, then rejected and retried', async ({ page }) => {
  await page.goto('./');
  await page
    .getByLabel('Ta note')
    .fill('Pâte à crêpes : 250 g de farine\nà ranger avec mes recettes');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();

  const row = page.getByRole('listitem').filter({ hasText: 'Pâte à crêpes' });
  await expect(row.getByText('Nouvelle note dans Recettes', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await row.getByRole('button', { name: 'Accepter' }).click();
  await expect(row.getByRole('button', { name: /Rangée/ })).toBeVisible();

  await row.getByRole('button', { name: 'Annuler le rangement' }).click();
  await expect(row.getByText(/Rangement annulé/)).toBeVisible();

  await row.getByRole('button', { name: 'Refuser' }).click();
  await expect(row.getByText('Proposition refusée. Ton texte est gardé tel quel.')).toBeVisible();
  await row.getByRole('button', { name: 'Relancer' }).click();
  await expect(row.getByRole('button', { name: /À valider/ })).toBeVisible({ timeout: 20_000 });
});

test('direct mode files without asking and can be undone', async ({ page }) => {
  await page.goto('./reglages');
  await page.getByLabel(/Ranger tout de suite/).check();
  await expect(page.getByRole('status')).toHaveText('Enregistré.');

  await page.goto('./');
  await page.getByLabel('Ta note').fill('Appeler le garage vendredi');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Appeler le garage vendredi' });
  await expect(row.getByRole('button', { name: /Rangée/ })).toBeVisible({ timeout: 20_000 });
  await expect(row.getByRole('button', { name: 'Annuler le rangement' })).toBeVisible();

  await page.goto('./reglages');
  await page.getByLabel(/Je valide chaque rangement/).check();
  await expect(page.getByRole('status')).toHaveText('Enregistré.');
});
