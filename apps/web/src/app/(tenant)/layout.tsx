import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if ((session.user as { role?: string })?.role === 'SUPER_ADMIN') redirect('/admin');
  return <>{children}</>;
}
