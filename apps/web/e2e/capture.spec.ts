import { expect, test } from '@playwright/test';

test('writing an entry puts it in the pocket and keeps the raw text', async ({ page }) => {
  await page.goto('./');
  const input = page.getByLabel('Ta note');
  await expect(input).toBeFocused();

  await input.fill('Acheter du café\nà ranger avec les courses');
  await page.getByRole('button', { name: 'Valider' }).click();

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
  await page.getByRole('button', { name: 'Valider' }).click();
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
