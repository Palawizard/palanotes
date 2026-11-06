import { expect, test } from '@playwright/test';

test.describe('search on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('results narrow by folder and by tag, as chips kept in the address', async ({ page }) => {
    await page.goto('./recherche?q=réseau');
    const refine = page.getByRole('complementary', { name: 'Affiner' });
    await refine
      .getByRole('region', { name: 'Dossiers' })
      .getByRole('link', { name: /^Cours \/ Réseaux? \/ TCP-IP \d+$/ })
      .click();
    await expect(page).toHaveURL(/dossier=.*sous=0/);
    const chips = page.getByRole('list', { name: 'Filtres actifs' });
    await expect(
      chips.getByRole('link', {
        name: /^Dossier seul Cours \/ Réseaux? \/ TCP-IP, retirer ce filtre$/,
      }),
    ).toBeVisible();
    const cards = page.locator('.result');
    for (const path of await cards.locator('.result-path').allTextContents()) {
      expect(path).toMatch(/^Cours \/ Réseaux? \/ TCP-IP$/);
    }

    await page.getByRole('link', { name: 'Filtrer sur le tag dns' }).click();
    await expect(page).toHaveURL(/tag=dns/);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('DNS : résolution pas à pas');

    await chips.getByRole('link', { name: /^Dossier.*retirer ce filtre$/ }).click();
    await expect(page).not.toHaveURL(/dossier=/);
    await expect(page).toHaveURL(/tag=dns/);
    await expect(page.getByRole('searchbox')).toHaveValue('réseau');
  });

  test('a folder filter can include its subfolders', async ({ page }) => {
    await page.goto('./recherche?q=réseau');
    await page
      .getByRole('complementary', { name: 'Affiner' })
      .getByRole('link', { name: /^Cours \/ Réseaux? \d+$/ })
      .click();
    await expect(page).toHaveURL(/sous=0/);
    await expect(page.getByRole('button', { name: 'Inclure les sous-dossiers' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const direct = await page.locator('.result').count();
    await page.getByRole('button', { name: 'Inclure les sous-dossiers' }).click();
    await expect(page).not.toHaveURL(/sous=0/);
    await expect.poll(() => page.locator('.result').count()).toBeGreaterThan(direct);
  });

  test('hovering or focusing a card shows the start of the note', async ({ page }) => {
    await page.goto('./recherche?q=sous-réseaux');
    // Other tests rename and move folders: look for a note they leave alone.
    const card = page.locator('.result').filter({ hasText: 'Adressage IPv4 et masques' });
    const preview = card.locator('.result-preview');
    await expect(preview).toBeHidden();
    await card.hover();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Notation CIDR');
    await page.mouse.move(5, 5);
    await expect(preview).toBeHidden();
    await card.getByRole('link').first().focus();
    await expect(preview).toBeVisible();
  });

  test('no result suggests removing a filter', async ({ page }) => {
    await page.goto('./recherche?q=crêpes&tag=réseau');
    await expect(page.getByText('Rien trouvé pour « crêpes » avec ces filtres.')).toBeVisible();
    await page.getByRole('link', { name: 'Chercher sans le filtre tag « réseau »' }).click();
    await expect(page.locator('.result').first()).toContainText('Crêpes');
  });
});

test.describe('search on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a result opens the note, and the way back keeps the search', async ({ page }) => {
    await page.goto('./recherche?q=dahl&tag=cuisine');
    const count = await page.locator('.result').count();
    await page.locator('.result').filter({ hasText: 'Dahl de lentilles corail' }).tap();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dahl de lentilles corail' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Retour aux résultats' }).tap();
    await expect(page).toHaveURL(/q=dahl/);
    await expect(page).toHaveURL(/tag=cuisine/);
    await expect(page.getByRole('searchbox')).toHaveValue('dahl');
    await expect(page.locator('.result')).toHaveCount(count);
  });
});
