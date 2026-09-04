import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import * as bcrypt from 'bcryptjs';
import { parseMemberRole } from '@/lib/constants';
import { requireTenantUser } from '@/lib/session';

export async function GET() {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem cadastrar equipe.' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await req.json();
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: parseMemberRole(role),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar membro.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem editar equipe.' }, { status: 403 });
  }

  try {
    const { id, name, email, password, role } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID do usuário não informado.' }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (email?.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== existing.email) {
        const emailCheck = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailCheck) {
          return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 400 });
        }
        updateData.email = cleanEmail;
      }
    }
    if (role) updateData.role = parseMemberRole(role);
    if (password?.trim()) updateData.passwordHash = await bcrypt.hash(password.trim(), 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar membro.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem remover membros.' }, { status: 403 });
  }

  const targetId = new URL(req.url).searchParams.get('id');
  if (!targetId) return NextResponse.json({ error: 'ID do usuário não informado.' }, { status: 400 });
  if (targetId === user.id) {
    return NextResponse.json({ error: 'Você não pode remover a sua própria conta.' }, { status: 400 });
  }

  await prisma.user.deleteMany({ where: { id: targetId, tenantId: user.tenantId } });
  return NextResponse.json({ success: true });
}
