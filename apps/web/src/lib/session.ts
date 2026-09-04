import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

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

export function ownsClient(
  user: { id: string },
  client: { assignedUserId: string | null }
) {
  return client.assignedUserId === user.id;
}

export function canManageTeam(role?: string | null) {
  return role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN';
}

export function canSeeTeamAggregates(role?: string | null) {
  return canManageTeam(role);
}

