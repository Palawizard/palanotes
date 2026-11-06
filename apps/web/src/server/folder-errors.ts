import 'server-only';
import { FolderMoveError, FolderNameTakenError } from '@palanotes/db';
import { z } from 'zod';

export const folderName = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !value.includes('/'), 'no slash');

export const NAME_MESSAGE = 'Nom invalide : 80 caractères au plus, sans « / ».';

// The answer to give for a refused folder change, or null when the error is unexpected.
export function folderErrorResponse(error: unknown): Response | null {
  if (error instanceof FolderNameTakenError) {
    return Response.json(
      { error: 'conflict', message: 'Un dossier porte déjà ce nom à cet endroit.' },
      { status: 409 },
    );
  }
  if (error instanceof FolderMoveError) {
    return Response.json(
      {
        error: 'conflict',
        message: 'Un dossier ne peut pas aller dans lui-même ni dans un de ses sous-dossiers.',
      },
      { status: 409 },
    );
  }
  return null;
}

export function badRequest(message: string): Response {
  return Response.json({ error: 'bad_request', message }, { status: 400 });
}

export function notFoundResponse(): Response {
  return Response.json(
    { error: 'not_found', message: 'Ce dossier n’existe plus. Recharge la page.' },
    { status: 404 },
  );
}
