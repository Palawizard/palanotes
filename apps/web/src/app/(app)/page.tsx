import { Desk } from '@/components/desk';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadPocket } from '@/server/entry-view';

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return <Desk initialEntries={await loadPocket(getDb(), user.id)} />;
}
