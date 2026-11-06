import type { Metadata } from 'next';
import { SortModeForm } from '@/components/sort-mode-form';
import { apiPath } from '@/lib/paths';
import { getCurrentUser } from '@/server/auth';

export const metadata: Metadata = { title: 'Réglages' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return (
    <div className="page-stack">
      <h1 className="page-title">Réglages</h1>
      <SortModeForm initialMode={user.sortMode} />
      <section className="settings-account" aria-labelledby="account-title">
        <h2 className="section-title" id="account-title">
          Compte
        </h2>
        <p>Connecté en tant que {user.displayName}, avec ton compte palawi.fr.</p>
        <form action={apiPath('/api/auth/logout')} method="post">
          <button type="submit" className="button button-quiet">
            Se déconnecter
          </button>
        </form>
      </section>
    </div>
  );
}
