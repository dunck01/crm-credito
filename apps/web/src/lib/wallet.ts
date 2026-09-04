import { prisma, type Prisma } from '@crm-credito/database';

type Db = Prisma.TransactionClient | typeof prisma;

export async function reassignClients(
  db: Db,
  opts: {
    tenantId: string;
    toUserId: string;
    fromUserId: string | null;
    historyTxt: string;
  }
) {
  const owned = await db.client.findMany({
    where: { tenantId: opts.tenantId, assignedUserId: opts.fromUserId },
    select: { id: true },
  });
  if (!owned.length) return 0;

  const ids = owned.map((c) => c.id);
  await db.client.updateMany({
    where: { id: { in: ids } },
    data: { assignedUserId: opts.toUserId },
  });
  await db.clientHistory.createMany({
    data: ids.map((clientId) => ({
      clientId,
      time: new Date().toLocaleString('pt-BR'),
      txt: opts.historyTxt,
    })),
  });
  return ids.length;
}

export async function claimOrphanClients(db: Db, tenantId: string, toUserId: string) {
  return reassignClients(db, {
    tenantId,
    toUserId,
    fromUserId: null,
    historyTxt: 'Cadastro assumido pela mesa (estava sem responsável).',
  });
}
