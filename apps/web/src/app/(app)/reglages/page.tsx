import type { Metadata } from 'next';
import { listPersonalTokens } from '@palanotes/db';
import { PersonalTokens } from '@/components/personal-tokens';
import { SortModeForm } from '@/components/sort-mode-form';
import { apiPath } from '@/lib/paths';
import { toTokenView } from '@/lib/token-view';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const metadata: Metadata = { title: 'Réglages' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const tokens = (await listPersonalTokens(getDb(), user.id)).map(toTokenView);
  return (
    <div className="settings">
      <h1 className="page-title">Réglages</h1>
      <section className="settings-section" aria-labelledby="sorting-title">
        <div className="settings-intro">
          <h2 className="section-title" id="sorting-title">
            Rangement
          </h2>
          <p className="settings-help">Ce qui se passe quand tu valides une note.</p>
        </div>
        <SortModeForm initialMode={user.sortMode} />
      </section>
      <section className="settings-section" aria-labelledby="tokens-title">
        <div className="settings-intro">
          <h2 className="section-title" id="tokens-title">
            Accès pour une autre app
          </h2>
          <p className="settings-help">
            Un jeton laisse une autre de tes apps lire et chercher tes notes, et y déposer du texte
            à ranger.
          </p>
        </div>
        <PersonalTokens initial={tokens} now={new Date().toISOString()} />
      </section>
      <section className="settings-section" aria-labelledby="account-title">
        <div className="settings-intro">
          <h2 className="section-title" id="account-title">
            Compte
          </h2>
          <p className="settings-help">Tes notes ne sont visibles que par toi.</p>
        </div>
        <div className="settings-card">
          <div className="settings-account">
            <span className="settings-avatar" aria-hidden="true">
              {user.displayName.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <div>
              <p className="settings-name">{user.displayName}</p>
              <p className="settings-help">Connecté avec ton compte palawi.fr</p>
            </div>
          </div>
          <form action={apiPath('/api/auth/logout')} method="post">
            <button type="submit" className="button button-quiet button-small">
              Se déconnecter
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
