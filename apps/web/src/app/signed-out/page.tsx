import type { Metadata } from 'next';
import { apiPath } from '@/lib/paths';

export const metadata: Metadata = { title: 'Déconnecté' };

export default async function SignedOutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="center-page">
      <div className="center-card">
        <h1 className="center-title">{error ? 'Connexion impossible' : 'À bientôt'}</h1>
        <p>
          {error
            ? 'La connexion avec ton compte palawi.fr n’a pas abouti. Réessaie dans un instant.'
            : 'Tu es déconnecté de Notes.'}
        </p>
        <a className="button" href={apiPath('/api/auth/login')}>
          Se connecter
        </a>
      </div>
    </main>
  );
}
