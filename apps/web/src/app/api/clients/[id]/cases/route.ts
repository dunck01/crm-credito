import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { serializeCase } from '@/lib/api-serialize';
import { ownsClient, requireTenantUser } from '@/lib/session';
import { parseMoney } from '@/lib/format';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!client || !ownsClient(user, client)) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const created = await prisma.insuranceCase.create({
      data: {
        tenantId: user.tenantId,
        clientId: params.id,
        policyNumber: body.policyNumber || null,
        insurer: body.insurer || null,
        insuranceType: body.insuranceType || null,
        identifiedAt: body.identifiedAt || null,
        policyStartAt: body.policyStartAt || null,
        policyEndAt: body.policyEndAt || null,
        quantity: Number(body.quantity) || 1,
        insuranceValue: parseMoney(body.insuranceValue),
        obs: body.obs || null,
        status: body.status || 'AGUARDANDO_CONTATO',
        expectedClientAmount: parseMoney(body.expectedClientAmount),
        companyAmount: parseMoney(body.companyAmount),
        myCommission: parseMoney(body.myCommission),
      },
      include: { documents: { select: { id: true, type: true, filename: true, mimeType: true, size: true, createdAt: true } } },
    });

    await prisma.clientHistory.create({
      data: {
        clientId: params.id,
        time: new Date().toLocaleString('pt-BR'),
        txt: `Novo caso cadastrado${created.insurer ? ` (${created.insurer})` : ''}${created.policyNumber ? ` · apólice ${created.policyNumber}` : ''}.`,
      },
    });

    return NextResponse.json(serializeCase(created), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao criar caso.' }, { status: 500 });
  }
}
