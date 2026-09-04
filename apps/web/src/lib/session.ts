import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { isAdminRole } from './constants';

export type AuthUser = {
  id: string;
  role: string;
  tenantId: string | null;
  tenantName?: string | null;
  name?: string | null;
  email?: string | null;
};

export async function requireSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user as AuthUser | undefined;
  if (!session || !user?.id) return null;
  return user;
}

export async function requireTenantUser() {
  const user = await requireSession();
  if (!user?.tenantId) return null;
  return { ...user, tenantId: user.tenantId };
}

export function canSeeAllClients(role?: string | null) {
  return isAdminRole(role);
}
