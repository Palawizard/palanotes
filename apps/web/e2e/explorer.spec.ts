import { expect, test } from '@playwright/test';

test.describe('explorer on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the tree opens with the keyboard and a note opens beside its list', async ({ page }) => {
    await page.goto('./dossiers');
    const tree = page.getByRole('tree', { name: 'Dossiers' });
    await expect(page.getByRole('heading', { level: 1, name: 'Récents' })).toBeVisible();

    await tree.getByRole('treeitem', { name: /^Administratif/ }).focus();
    await page.keyboard.press('c');
    await expect(tree.getByRole('treeitem', { name: /^Cours,/ })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tree.getByRole('treeitem', { name: /^Cours,/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.keyboard.press('r');
    await expect(tree.getByRole('treeitem', { name: /^Réseaux?,/ })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('t');
    const tcp = tree.getByRole('treeitem', { name: /^TCP-IP,/ });
    await expect(tcp).toBeFocused();
    await expect(tcp).toHaveAttribute('aria-label', 'TCP-IP, 13 notes dont 5 ici');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 1, name: 'TCP-IP' })).toBeVisible();
    await expect(tcp).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('5 notes ici, 13 avec les sous-dossiers')).toBeVisible();

    const list = page.getByRole('list', { name: 'Notes de TCP-IP' });
    await list.getByRole('link', { name: /Adressage IPv4 et masques/ }).click();
    await expect(page).toHaveURL(/\?note=/);
    const opened = page.getByRole('region', { name: 'Note ouverte' });
    await expect(opened.getByRole('heading', { name: 'Adressage IPv4 et masques' })).toBeVisible();
    await expect(list.getByRole('link', { name: /Adressage IPv4/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(tree.getByRole('treeitem', { name: /^Couche transport,/ })).toHaveCount(0);
  });

  test('notes sort by title and the choice stays in the address', async ({ page }) => {
    await page.goto('./dossiers/recents');
    await page
      .getByRole('tree')
      .getByRole('treeitem', { name: /^Courses,/ })
      .click();
    await page.getByRole('navigation', { name: 'Trier les notes' }).getByText('Titre').click();
    await expect(page).toHaveURL(/tri=titre/);
    const titles = await page
      .getByRole('list', { name: 'Notes de Courses' })
      .locator('.note-row-title')
      .allTextContents();
    expect(titles.length).toBeGreaterThan(40);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })),
    );
  });

  test('a large folder shows its first notes, then more on request', async ({ page }) => {
    await page.goto('./dossiers/recents');
    const tree = page.getByRole('tree');
    await tree
      .getByRole('treeitem', { name: /^Perso,/ })
      .locator('.tree-toggle')
      .click();
    await tree.getByRole('treeitem', { name: /^Journal,/ }).click();
    const list = page.getByRole('list', { name: 'Notes de Journal' });
    await expect(list.getByRole('listitem')).toHaveCount(50);
    await page.getByRole('link', { name: 'Afficher 20 notes de plus' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(70);
  });
});

test.describe('explorer on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('folders, then notes, then one note, with a way back each time', async ({ page }) => {
    await page.goto('./dossiers');
    const tree = page.getByRole('tree', { name: 'Dossiers' });
    await expect(tree).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Récents' })).toBeHidden();

    await tree.getByRole('treeitem', { name: /^Idées en vrac,/ }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Idées en vrac' })).toBeVisible();
    await expect(tree).toBeHidden();

    await page
      .getByRole('list', { name: 'Notes de Idées en vrac' })
      .getByRole('link')
      .first()
      .tap();
    const opened = page.getByRole('region', { name: 'Note ouverte' });
    await expect(opened.getByRole('button', { name: 'Modifier' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Idées en vrac' })).toBeHidden();

    await opened.getByRole('link', { name: 'Idées en vrac' }).first().tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Idées en vrac' })).toBeVisible();
    await page.getByRole('link', { name: 'Dossiers', exact: true }).last().tap();
    await expect(tree).toBeVisible();
  });
});
