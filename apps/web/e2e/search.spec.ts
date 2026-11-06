import { expect, test } from '@playwright/test';

test('search finds a note filed in the wrong folder, with and without accents and with a typo', async ({
  page,
}) => {
  await page.goto('./');
  await page
    .getByLabel('Ta note')
    .fill(
      'Modèle OSI : sept couches, la couche transport assure la fiabilité\nà ranger avec ma cuisine',
    );
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Modèle OSI' });
  await row.getByRole('button', { name: 'Accepter' }).click({ timeout: 20_000 });
  await expect(row.getByRole('link', { name: 'Ouvrir la note' })).toBeVisible();

  for (const query of ['modèle osi', 'modele osi', 'modle osi', 'fiabilite']) {
    await page.goto(`./recherche?q=${encodeURIComponent(query)}`);
    // The demo account has its own notes on the OSI model: look for this one.
    const result = page.getByRole('listitem').filter({ hasText: 'la couche transport assure' });
    await expect(result).toBeVisible();
    await expect(result).toContainText('Cuisine');
  }

  await page.goto('./recherche');
  await page.getByLabel('Chercher dans tes notes').fill('ornithorynque');
  await page.getByRole('button', { name: 'Chercher' }).click();
  await expect(page.getByText('Rien trouvé pour « ornithorynque ».')).toBeVisible();
});
