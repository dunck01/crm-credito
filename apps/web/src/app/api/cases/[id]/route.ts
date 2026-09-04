import { NextResponse } from 'next/server';
import { prisma, CaseStatus } from '@crm-credito/database';
import { serializeCase } from '@/lib/api-serialize';
import { parseMoney } from '@/lib/format';
import { canSeeAllClients, requireTenantUser } from '@/lib/session';
import { CASE_STAGES } from '@/lib/constants';

const VALID_STATUS = new Set(CASE_STAGES.map((s) => s.key));

function moneyOrSkip(value: unknown) {
  if (value === undefined) return undefined;
  return parseMoney(value);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const existing = await prisma.insuranceCase.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { client: true },
  });
  if (!existing) return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 });
  if (!canSeeAllClients(user.role) && existing.client.assignedUserId !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (body.status && !VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const nextStatus = body.status as CaseStatus | undefined;
    const confirmedAt = body.cancellationConfirmedAt !== undefined
      ? body.cancellationConfirmedAt || null
      : existing.cancellationConfirmedAt;

    const leavingEarlyStage =
      existing.status !== 'PAGAMENTO' && existing.status !== 'FINALIZADO';
    if (
      (nextStatus === 'PAGAMENTO' || nextStatus === 'FINALIZADO') &&
      leavingEarlyStage &&
      !confirmedAt
    ) {
      return NextResponse.json(
        { error: 'Confirme o cancelamento do seguro antes de avançar para pagamento.' },
        { status: 400 }
      );
    }

    const updated = await prisma.insuranceCase.update({
      where: { id: params.id },
      data: {
        policyNumber: body.policyNumber !== undefined ? body.policyNumber || null : undefined,
        insurer: body.insurer !== undefined ? body.insurer || null : undefined,
        insuranceType: body.insuranceType !== undefined ? body.insuranceType || null : undefined,
        identifiedAt: body.identifiedAt !== undefined ? body.identifiedAt || null : undefined,
        quantity: body.quantity !== undefined ? Number(body.quantity) || 1 : undefined,
        insuranceValue: moneyOrSkip(body.insuranceValue),
        obs: body.obs !== undefined ? body.obs || null : undefined,
        status: nextStatus,
        contractStatus: body.contractStatus !== undefined ? body.contractStatus : undefined,
        cancellationRequestedAt: body.cancellationRequestedAt !== undefined ? body.cancellationRequestedAt || null : undefined,
        cancellationConfirmedAt: body.cancellationConfirmedAt !== undefined ? body.cancellationConfirmedAt || null : undefined,
        cancellationNotes: body.cancellationNotes !== undefined ? body.cancellationNotes || null : undefined,
        expectedClientAmount: moneyOrSkip(body.expectedClientAmount),
        receivedClientAmount: moneyOrSkip(body.receivedClientAmount),
        clientReceivedAt: body.clientReceivedAt !== undefined ? body.clientReceivedAt || null : undefined,
        companyAmount: moneyOrSkip(body.companyAmount),
        companyDueAt: body.companyDueAt !== undefined ? body.companyDueAt || null : undefined,
        companyPaidAmount: moneyOrSkip(body.companyPaidAmount),
        companyPaidAt: body.companyPaidAt !== undefined ? body.companyPaidAt || null : undefined,
        myCommission: moneyOrSkip(body.myCommission),
      },
      include: {
        documents: {
          select: { id: true, type: true, filename: true, mimeType: true, size: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (nextStatus && nextStatus !== existing.status) {
      const title = CASE_STAGES.find((s) => s.key === nextStatus)?.title || nextStatus;
      await prisma.clientHistory.create({
        data: {
          clientId: existing.clientId,
          time: new Date().toLocaleString('pt-BR'),
          txt: `Caso movido para "${title}".`,
        },
      });
    }

    return NextResponse.json(serializeCase(updated));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar caso.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canSeeAllClients(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem excluir casos.' }, { status: 403 });
  }

  await prisma.insuranceCase.deleteMany({ where: { id: params.id, tenantId: user.tenantId } });
  return NextResponse.json({ success: true });
}
