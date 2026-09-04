import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import { ownsClient, requireTenantUser } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const doc = await prisma.caseDocument.findFirst({
    where: { id: params.docId, caseId: params.id, case: { tenantId: user.tenantId } },
    include: { case: { include: { client: true } } },
  });

  if (!doc || !ownsClient(user, doc.case.client)) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }

  const bytes = Buffer.from(doc.data);
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      'Content-Length': String(doc.size),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const doc = await prisma.caseDocument.findFirst({
    where: { id: params.docId, caseId: params.id, case: { tenantId: user.tenantId } },
    include: { case: { include: { client: true } } },
  });

  if (!doc || !ownsClient(user, doc.case.client)) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }

  await prisma.caseDocument.delete({ where: { id: doc.id } });
  return NextResponse.json({ success: true });
}
