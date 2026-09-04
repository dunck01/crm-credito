import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { canManageTeam, requireTenantUser } from '@/lib/session';
import { claimOrphanClients } from '@/lib/wallet';

export async function POST() {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const claimed = await claimOrphanClients(prisma, user.tenantId, user.id);
  return NextResponse.json({ claimed });
}
