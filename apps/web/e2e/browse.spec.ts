import { expect, test, type Page } from '@playwright/test';

async function fileEntry(page: Page, text: string): Promise<void> {
  await page.goto('./');
  await page.getByLabel('Ta note').fill(text);
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  const row = page.getByRole('listitem').filter({ hasText: text.split('\n')[0] ?? text });
  await row.getByRole('button', { name: 'Accepter' }).click({ timeout: 20_000 });
  await row.getByRole('link', { name: 'Ouvrir la note' }).click();
}

test('a filed note can be read, edited, moved, and its folder renamed', async ({ page }) => {
  await fileEntry(page, 'Sous-réseaux IPv4\nà ranger avec mes cours système');

  await expect(page.getByRole('heading', { level: 1, name: 'Sous-réseaux IPv4' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Chemin' })).toContainText('Cours système');

  await page.getByRole('button', { name: 'Modifier' }).click();
  await page.getByLabel('Titre').fill('Sous-réseaux et masques');
  await page
    .getByLabel('Contenu (Markdown)')
    .fill('## Masques\n\n- /24 : 254 hôtes\n- /26 : 62 hôtes');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sous-réseaux et masques' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Masques' })).toBeVisible();

  await page.getByRole('button', { name: 'Déplacer' }).click();
  await page.getByLabel('Dossier').selectOption({ label: 'Nouveau dossier…' });
  await page.getByLabel('Chemin du nouveau dossier').fill('Cours / Réseau');
  await page.getByRole('button', { name: 'Déplacer ici' }).click();
  await expect(page.getByRole('navigation', { name: 'Chemin' })).toContainText('Réseau');

  await page
    .getByRole('navigation', { name: 'Chemin' })
    .getByRole('link', { name: 'Réseau' })
    .click();
  await expect(page.getByRole('link', { name: 'Sous-réseaux et masques' })).toBeVisible();
  await page.getByRole('button', { name: 'Renommer' }).click();
  await page.getByLabel('Nom du dossier').fill('Réseaux');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Réseaux' })).toBeVisible();

  await page.getByRole('link', { name: 'Dossiers', exact: true }).first().click();
  const tree = page.getByRole('navigation', { name: 'Dossiers' });
  await expect(tree.getByRole('link', { name: /Réseaux/ })).toBeVisible();
});

test('a note of another id shows the not found page', async ({ page }) => {
  const response = await page.goto('./note/00000000-0000-4000-8000-000000000000');
  expect(response?.status()).toBe(404);
});
