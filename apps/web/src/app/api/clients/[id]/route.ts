import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { clientInclude, serializeClient } from '@/lib/api-serialize';
import { digitsOnly } from '@/lib/format';
import { ownsClient, requireTenantUser } from '@/lib/session';

async function loadOwnedClient(clientId: string, tenantId: string, userId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    include: clientInclude,
  });
  if (!client || !ownsClient({ id: userId }, client)) {
    return { error: 'Cliente não encontrado.', status: 404 as const };
  }
  return { client };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const result = await loadOwnedClient(params.id, user.tenantId, user.id);
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(serializeClient(result.client));
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const result = await loadOwnedClient(params.id, user.tenantId, user.id);
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name || '').trim();
    if (body.cpf !== undefined) {
      const cpf = digitsOnly(body.cpf);
      if (cpf.length !== 11 && cpf.length !== 14) {
        return NextResponse.json({ error: 'CPF/CNPJ inválido. Informe 11 ou 14 dígitos.' }, { status: 400 });
      }
      if (cpf !== result.client!.cpf) {
        const clash = await prisma.client.findFirst({
          where: { tenantId: user.tenantId, cpf, NOT: { id: params.id } },
        });
        if (clash) return NextResponse.json({ error: 'Já existe um cliente com este CPF nesta mesa.' }, { status: 409 });
      }
      data.cpf = cpf;
    }
    if (body.phone !== undefined) data.phone = digitsOnly(body.phone) || null;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.city !== undefined) data.city = body.city?.trim() || null;
    if (body.uf !== undefined) data.uf = body.uf?.trim()?.toUpperCase()?.slice(0, 2) || null;
    if (body.obs !== undefined) data.obs = body.obs || null;
    if (body.lastContactDate !== undefined) data.lastContactDate = body.lastContactDate || null;
    if (body.taskDate !== undefined) data.taskDate = body.taskDate || null;
    if (body.taskTime !== undefined) data.taskTime = body.taskTime || null;
    if (body.isArchived !== undefined) data.isArchived = Boolean(body.isArchived);
    if (body.doNotContact !== undefined) {
      data.doNotContact = Boolean(body.doNotContact);
      data.doNotContactReason = body.doNotContact ? body.doNotContactReason || 'OUTRO' : null;
    } else if (body.doNotContactReason !== undefined) {
      data.doNotContactReason = body.doNotContactReason || null;
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data,
      include: clientInclude,
    });

    return NextResponse.json(serializeClient(updated));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar cliente.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!client || !ownsClient(user, client)) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  }

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
