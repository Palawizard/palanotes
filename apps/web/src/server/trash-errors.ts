import 'server-only';

export function trashNotFoundResponse(): Response {
  return Response.json(
    { error: 'not_found', message: 'Cet élément n’est plus dans la corbeille. Recharge la page.' },
    { status: 404 },
  );
}
