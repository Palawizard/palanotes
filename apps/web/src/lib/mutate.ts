import { apiPath } from './paths';

export type SendResult<T> = { ok: true; data: T } | { ok: false; message: string };

// JSON request to one of our route handlers. Returns the parsed answer, or the message
// to show when it failed.
export async function send<T = unknown>(
  path: string,
  method: 'PATCH' | 'POST' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<SendResult<T>> {
  try {
    const response = await fetch(apiPath(path), {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as T & { message?: string };
    if (response.ok) {
      return { ok: true, data };
    }
    return { ok: false, message: data.message ?? fallback };
  } catch {
    return { ok: false, message: 'Connexion perdue. Réessaie.' };
  }
}

// Same, for callers that only need the error message, or null on success.
export async function mutate(
  path: string,
  method: 'PATCH' | 'POST' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<string | null> {
  const result = await send(path, method, body, fallback);
  return result.ok ? null : result.message;
}
