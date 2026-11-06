import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppNav, SettingsLink } from '@/components/app-nav';
import { apiPath } from '@/lib/paths';
import { getCurrentUser } from '@/server/auth';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/login');
  }
  return (
    <div className="shell">
      <header className="rail">
        <Link className="rail-brand" href="/">
          Notes
        </Link>
        <AppNav />
        <div className="rail-foot">
          <SettingsLink />
          <span className="rail-user">{user.displayName}</span>
          <form action={apiPath('/api/auth/logout')} method="post">
            <button type="submit" className="rail-link rail-signout">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <div className="page">
        <main className="main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
