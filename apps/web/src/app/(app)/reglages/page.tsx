import type { Metadata } from 'next';
import { SortModeForm } from '@/components/sort-mode-form';
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
    </div>
  );
}
