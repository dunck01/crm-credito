import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { canSeeAllClients, requireTenantUser } from '@/lib/session';

async function getClient(clientId: string, tenantId: string, userId: string, role: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } });
  if (!client) return { error: 'Cliente não encontrado.', status: 404 as const };
  if (!canSeeAllClients(role) && client.assignedUserId !== userId) {
    return { error: 'Acesso negado.', status: 403 as const };
  }
  return { client };
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const owned = await getClient(params.id, user.tenantId, user.id, user.role);
  if ('error' in owned && owned.error) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  try {
    const { txt, time } = await req.json();
    if (!txt?.trim()) return NextResponse.json({ error: 'Informe a nota.' }, { status: 400 });

    const note = await prisma.clientHistory.create({
      data: {
        clientId: params.id,
        time: time || new Date().toLocaleString('pt-BR'),
        txt: txt.trim(),
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao salvar histórico.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const owned = await getClient(params.id, user.tenantId, user.id, user.role);
  if ('error' in owned && owned.error) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const noteId = new URL(req.url).searchParams.get('noteId');
  if (!noteId) return NextResponse.json({ error: 'noteId obrigatório.' }, { status: 400 });

  await prisma.clientHistory.deleteMany({ where: { id: noteId, clientId: params.id } });
  return NextResponse.json({ success: true });
}
