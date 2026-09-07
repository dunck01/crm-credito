import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { decimalNumber } from '@/lib/format';
import { canSeeTeamAggregates, requireTenantUser } from '@/lib/session';

export async function GET(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (user.role !== 'SUPERVISOR' || !canSeeTeamAggregates(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const memberId = new URL(req.url).searchParams.get('userId');
  if (!memberId) {
    return NextResponse.json({ error: 'Membro não informado.' }, { status: 400 });
  }

  const clients = await prisma.client.findMany({
    where: {
      tenantId: user.tenantId,
      isArchived: false,
      assignedUser: { id: memberId, supervisorId: user.id },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      uf: true,
      doNotContact: true,
      taskDate: true,
      taskTime: true,
      assignedUser: { select: { id: true, name: true } },
      cases: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          policyNumber: true,
          insurer: true,
          insuranceType: true,
          status: true,
          insuranceValue: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(clients.map((client) => ({
    ...client,
    phone: client.phone || '',
    email: client.email || '',
    city: client.city || '',
    uf: client.uf || '',
    taskDate: client.taskDate || '',
    taskTime: client.taskTime || '',
    cases: client.cases.map((caseItem) => ({
      ...caseItem,
      policyNumber: caseItem.policyNumber || '',
      insurer: caseItem.insurer || '',
      insuranceType: caseItem.insuranceType || '',
      insuranceValue: caseItem.insuranceValue == null ? null : decimalNumber(caseItem.insuranceValue),
    })),
  })));
}
