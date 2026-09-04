import { NextResponse } from 'next/server';
import { prisma, DocumentType } from '@crm-credito/database';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';
import { canSeeAllClients, requireTenantUser } from '@/lib/session';

async function getOwnedCase(caseId: string, tenantId: string, userId: string, role: string) {
  const item = await prisma.insuranceCase.findFirst({
    where: { id: caseId, tenantId },
    include: { client: true },
  });
  if (!item) return { error: 'Caso não encontrado.', status: 404 as const };
  if (!canSeeAllClients(role) && item.client.assignedUserId !== userId) {
    return { error: 'Acesso negado.', status: 403 as const };
  }
  return { item };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const owned = await getOwnedCase(params.id, user.tenantId, user.id, user.role);
  if ('error' in owned && owned.error) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const docs = await prisma.caseDocument.findMany({
    where: { caseId: params.id },
    select: { id: true, type: true, filename: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(docs);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const owned = await getOwnedCase(params.id, user.tenantId, user.id, user.role);
  if ('error' in owned && owned.error) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const type = String(form.get('type') || 'OUTRO') as DocumentType;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Arquivo acima de 4 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const created = await prisma.caseDocument.create({
      data: {
        caseId: params.id,
        type: Object.values(DocumentType).includes(type) ? type : DocumentType.OUTRO,
        filename: file.name || 'arquivo',
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data: buffer,
      },
      select: { id: true, type: true, filename: true, mimeType: true, size: true, createdAt: true },
    });

    await prisma.clientHistory.create({
      data: {
        clientId: owned.item!.clientId,
        time: new Date().toLocaleString('pt-BR'),
        txt: `Documento anexado: ${created.filename}.`,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao enviar arquivo.' }, { status: 500 });
  }
}
