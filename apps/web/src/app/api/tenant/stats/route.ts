import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { canSeeTeamAggregates, requireTenantUser } from '@/lib/session';
import { decimalNumber } from '@/lib/format';
import type { SellerTeamStat } from '@/lib/types';

export async function GET() {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canSeeTeamAggregates(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  // Load team members in this tenant
  const members = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Query only aggregated fields for active clients - strictly NO client PII or IDs
  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId, isArchived: false },
    select: {
      assignedUserId: true,
      doNotContact: true,
      cases: {
        select: {
          status: true,
          insuranceValue: true,
          receivedClientAmount: true,
          companyAmount: true,
          myCommission: true,
        },
      },
    },
  });

  const initStatusCounts = (): Record<string, number> => ({
    AGUARDANDO_CONTATO: 0,
    AGUARDANDO_RESPOSTA: 0,
    NAO_ACEITOU: 0,
    CONVERTIDO: 0,
    CANCELAMENTO: 0,
    PAGAMENTO: 0,
    FINALIZADO: 0,
    PERDIDO: 0,
  });

  const statsMap = new Map<string, SellerTeamStat>();

  for (const m of members) {
    statsMap.set(m.id, {
      userId: m.id,
      name: m.name,
      clientsCount: 0,
      casesCount: 0,
      statusCounts: initStatusCounts(),
      insuranceValue: 0,
      receivedClientAmount: 0,
      companyAmount: 0,
      myCommission: 0,
      doNotContactCount: 0,
    });
  }

  for (const client of clients) {
    if (!client.assignedUserId) continue;
    const stat = statsMap.get(client.assignedUserId);
    if (!stat) continue;

    stat.clientsCount += 1;
    if (client.doNotContact) {
      stat.doNotContactCount += 1;
    }

    for (const c of client.cases) {
      stat.casesCount += 1;
      if (c.status && stat.statusCounts[c.status] !== undefined) {
        stat.statusCounts[c.status] += 1;
      }
      stat.insuranceValue += decimalNumber(c.insuranceValue);
      stat.receivedClientAmount += decimalNumber(c.receivedClientAmount);
      stat.companyAmount += decimalNumber(c.companyAmount);
      stat.myCommission += decimalNumber(c.myCommission);
    }
  }

  const orphanClientsCount = await prisma.client.count({
    where: { tenantId: user.tenantId, assignedUserId: null },
  });

  return NextResponse.json({
    team: Array.from(statsMap.values()),
    orphanClientsCount,
  });
}
