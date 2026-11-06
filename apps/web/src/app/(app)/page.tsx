import { Desk } from '@/components/desk';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadPocket } from '@/server/entry-view';

const today = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
});

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const date = today.format(new Date());
  return (
    <>
      <p className="sheet-date">{date.charAt(0).toUpperCase() + date.slice(1)}</p>
      <Desk initialEntries={await loadPocket(getDb(), user.id)} />
    </>
  );
}
