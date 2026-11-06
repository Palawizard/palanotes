import type { Metadata } from 'next';
import { RecentView } from '@/components/recent-view';
import { getCurrentUser } from '@/server/auth';

export const metadata: Metadata = { title: 'Récents' };

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return <RecentView userId={user.id} noteParam={(await searchParams).note} phoneLevel="list" />;
}
