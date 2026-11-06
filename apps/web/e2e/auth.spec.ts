import { expect, test } from '@playwright/test';

test('an anonymous visitor is sent through sign-in and lands on the home page', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await expect(page.getByText('Bonjour Palawi')).toBeVisible();

  const session = (await context.cookies()).find((c) => c.name === 'palawi_notes_session');
  expect(session).toMatchObject({ path: '/notes', httpOnly: true, secure: true, sameSite: 'Lax' });
});

test('api routes answer 401 without a session', async ({ request }) => {
  const response = await request.get('api/entries');
  expect(response.status()).toBe(401);
});

test('health stays public', async ({ request }) => {
  const response = await request.get('api/health');
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('a mutation from another origin is refused', async ({ request }) => {
  const response = await request.post('api/auth/logout', {
    headers: { origin: 'https://evil.example' },
  });
  expect(response.status()).toBe(403);
});
