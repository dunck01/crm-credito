import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { clientInclude, serializeClient } from '@/lib/api-serialize';
import { digitsOnly, parseMoney } from '@/lib/format';
import { canSeeAllClients, requireTenantUser } from '@/lib/session';

export async function GET(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get('archived') === 'true';
  const cpfParam = digitsOnly(searchParams.get('cpf') || '');

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    isArchived: archived,
  };

  if (!canSeeAllClients(user.role)) {
    where.assignedUserId = user.id;
  }

  if (cpfParam) {
    where.cpf = cpfParam;
    delete where.isArchived;
  }

  const clients = await prisma.client.findMany({
    where,
    include: clientInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(clients.map(serializeClient));
}

export async function POST(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const cpf = digitsOnly(body.cpf);

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    if (cpf.length !== 11) return NextResponse.json({ error: 'CPF inválido. Informe 11 dígitos.' }, { status: 400 });

    const existing = await prisma.client.findFirst({
      where: { tenantId: user.tenantId, cpf },
      include: clientInclude,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um cliente com este CPF.', client: serializeClient(existing) },
        { status: 409 }
      );
    }

    const assignedUserId = canSeeAllClients(user.role)
      ? body.assignedUserId || user.id
      : user.id;

    const created = await prisma.client.create({
      data: {
        tenantId: user.tenantId,
        assignedUserId: assignedUserId || user.id,
        name,
        cpf,
        phone: digitsOnly(body.phone) || null,
        email: body.email?.trim() || null,
        city: body.city?.trim() || null,
        uf: body.uf?.trim()?.toUpperCase()?.slice(0, 2) || null,
        obs: body.obs || null,
        doNotContact: Boolean(body.doNotContact),
        doNotContactReason: body.doNotContact ? body.doNotContactReason || 'OUTRO' : null,
        lastContactDate: body.lastContactDate || null,
        taskDate: body.taskDate || null,
        taskTime: body.taskTime || null,
        cases: body.case
          ? {
              create: {
                tenantId: user.tenantId,
                policyNumber: body.case.policyNumber || null,
                insurer: body.case.insurer || null,
                insuranceType: body.case.insuranceType || null,
                identifiedAt: body.case.identifiedAt || null,
                quantity: Number(body.case.quantity) || 1,
                insuranceValue: parseMoney(body.case.insuranceValue),
                obs: body.case.obs || null,
                status: body.case.status || 'AGUARDANDO_CONTATO',
                expectedClientAmount: parseMoney(body.case.expectedClientAmount),
                companyAmount: parseMoney(body.case.companyAmount),
                myCommission: parseMoney(body.case.myCommission),
              },
            }
          : {
              create: {
                tenantId: user.tenantId,
                status: 'AGUARDANDO_CONTATO',
              },
            },
        history: {
          create: [{ time: new Date().toLocaleString('pt-BR'), txt: 'Cliente cadastrado.' }],
        },
      },
      include: clientInclude,
    });

    return NextResponse.json(serializeClient(created), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao criar cliente.' }, { status: 500 });
  }
}
