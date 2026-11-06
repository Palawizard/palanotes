import { apiPath } from './paths';

// JSON request to one of our route handlers; returns the error message to show, or null.
export async function mutate(
  path: string,
  method: 'PATCH' | 'POST',
  body: unknown,
  fallback: string,
): Promise<string | null> {
  try {
    const response = await fetch(apiPath(path), {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return null;
    }
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    return data.message ?? fallback;
  } catch {
    return 'Connexion perdue. Réessaie.';
  }
}
