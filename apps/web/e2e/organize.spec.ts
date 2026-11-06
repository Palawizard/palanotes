import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

function tree(page: Page) {
  return page.getByRole('tree', { name: 'Dossiers' });
}

async function openFolder(page: Page, path: string[]): Promise<void> {
  for (const name of path.slice(0, -1)) {
    const item = tree(page).getByRole('treeitem', { name: new RegExp(`^${name}(?: \\d+)?$`) });
    if ((await item.getAttribute('aria-expanded')) !== 'true') {
      await item.locator('.tree-toggle').first().click();
    }
  }
  await tree(page)
    .getByRole('treeitem', { name: new RegExp(`^${path.at(-1)}(?: \\d+)?$`) })
    .locator('.tree-link')
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: path.at(-1) })).toBeVisible();
}

test('a note dragged onto a folder of the tree moves there', async ({ page }) => {
  await page.goto('./dossiers/recents');
  await openFolder(page, ['Idées en vrac']);
  const row = page
    .getByRole('list', { name: 'Notes de Idées en vrac' })
    .getByRole('link', { name: /Nettoyer le clavier/ });
  await row.dragTo(
    tree(page)
      .getByRole('treeitem', { name: /^Archives(?: \d+)?$/ })
      .locator('.tree-row'),
  );

  await expect(page.getByRole('status')).toHaveText(
    '« Nettoyer le clavier » déplacée dans Archives.',
  );
  await expect(row).toHaveCount(0);
  await expect(
    tree(page).getByRole('treeitem', { name: /^Archives(?: \d+)?$/ }),
  ).toHaveAccessibleDescription('1 note');
});

test('two folders merge from the context menu, notes included', async ({ page }) => {
  await page.goto('./dossiers/recents');
  await openFolder(page, ['Perso', 'Lectures', 'Essais']);
  await tree(page)
    .getByRole('treeitem', { name: /^Essais(?: \d+)?$/ })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Fusionner dans…' }).click();

  const dialog = page.getByRole('dialog', { name: 'Fusionner le dossier' });
  await expect(dialog).toContainText('Aucune note n’est supprimée.');
  await dialog.getByRole('combobox').fill('romans');
  await dialog.getByRole('option', { name: /Perso \/ Lectures \/ Romans/ }).click();
  await dialog.getByRole('button', { name: 'Fusionner' }).click();

  await expect(page.getByRole('status')).toHaveText(
    '« Essais » fusionné dans Perso / Lectures / Romans : 2 notes déplacées.',
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Romans' })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Notes de Romans' }).getByRole('listitem'),
  ).toHaveCount(5);
  await expect(tree(page).getByRole('treeitem', { name: /^Essais(?: \d+)?$/ })).toHaveCount(0);
});

test('a folder moves with the keyboard, never into its own subfolders', async ({ page }) => {
  await page.goto('./dossiers/recents');
  await openFolder(page, ['Projets', 'Jeu multijoueur']);
  const game = tree(page).getByRole('treeitem', { name: /^Jeu multijoueur(?: \d+)?$/ });
  await game.focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Actions sur Jeu multijoueur' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Déplacer vers…' })).toBeFocused();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Déplacer le dossier' });
  await page.keyboard.type('gameplay');
  await expect(dialog.getByRole('option', { name: /Gameplay/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await dialog.getByRole('combobox').fill('');
  await page.keyboard.type('perso');
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('option', { name: /^Perso/ }).first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');

  await expect(page.getByRole('status')).toHaveText(
    'Dossier « Jeu multijoueur » déplacé dans Perso.',
  );
  await expect(dialog).toBeHidden();
  await expect(game).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Chemin' })).toContainText('Perso');
});

test('a new folder can be created, and deleted while it is empty', async ({ page }) => {
  await page.goto('./dossiers/recents');
  await page.getByRole('button', { name: 'Nouveau dossier' }).click();
  const create = page.getByRole('dialog', { name: 'Nouveau dossier' });
  await create.getByLabel('Nom du dossier').fill('Brouillons');
  await create.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Brouillons' })).toBeVisible();
  await expect(page.getByText('Ce dossier est vide.')).toBeVisible();

  await page.getByRole('button', { name: 'Actions sur Brouillons' }).last().click();
  await page.getByRole('menuitem', { name: 'Supprimer…' }).click();
  const confirm = page.getByRole('dialog', { name: 'Supprimer le dossier' });
  await confirm.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('status')).toHaveText('Dossier « Brouillons » supprimé.');
  await expect(tree(page).getByRole('treeitem', { name: /^Brouillons(?: \d+)?$/ })).toHaveCount(0);

  await openFolder(page, ['Courses']);
  await page.getByRole('button', { name: 'Actions sur Courses' }).last().click();
  await expect(
    page.getByRole('menuitem', { name: 'Supprimer (dossier vide seulement)' }),
  ).toBeDisabled();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a note moves through « Déplacer vers… » instead of dragging', async ({ page }) => {
    await page.goto('./dossiers');
    await tree(page)
      .getByRole('treeitem', { name: /^Idées en vrac(?: \d+)?$/ })
      .tap();
    await page
      .getByRole('list', { name: 'Notes de Idées en vrac' })
      .getByRole('link', { name: /Planter du basilic/ })
      .tap();
    await page.getByRole('button', { name: 'Déplacer vers…' }).tap();
    const dialog = page.getByRole('dialog', { name: 'Déplacer la note' });
    await dialog.getByRole('combobox').fill('cuisine');
    await dialog.getByRole('option', { name: 'Perso / Cuisine', exact: true }).tap();
    await dialog.getByRole('button', { name: 'Déplacer ici' }).tap();
    await expect(page.getByRole('status')).toHaveText(
      '« Planter du basilic sur le balcon » déplacée dans Perso / Cuisine.',
    );
  });
});
