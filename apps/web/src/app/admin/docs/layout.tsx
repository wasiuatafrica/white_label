import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseAdminSessionFromRequest } from '@/lib/admin-session';

export default async function AdminDocsLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const request = new Request('http://internal/admin/docs', {
    headers: { cookie: headerStore.get('cookie') ?? '' },
  });
  const session = await parseAdminSessionFromRequest(request);
  if (!session) {
    redirect('/admin');
  }
  return children;
}
