import { listRecentEntries } from '@palanotes/db';
import { Desk } from '@/components/desk';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { toEntryView } from '@/server/entry-view';

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const entries = await listRecentEntries(getDb(), user.id);
  return <Desk initialEntries={entries.map(toEntryView)} />;
}
