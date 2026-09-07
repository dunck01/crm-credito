import { NextResponse } from 'next/server';
import { prisma } from '@crm-credito/database';
import * as bcrypt from 'bcryptjs';
import { parseMemberRole } from '@/lib/constants';
import { canGrantSupervisor, canManageTeamUsers, requireTenantUser } from '@/lib/session';
import { claimOrphanClients, reassignClients } from '@/lib/wallet';

export async function GET() {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canManageTeamUsers(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const where = user.role === 'SUPERVISOR'
    ? { tenantId: user.tenantId, supervisorId: user.id }
    : { tenantId: user.tenantId };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      supervisorId: true,
      supervisor: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users.map(({ supervisor, ...member }) => ({
    ...member,
    supervisorName: supervisor?.name || null,
  })));
}

export async function POST(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canManageTeamUsers(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
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

    const isSupervisor = user.role === 'SUPERVISOR';
    const memberRole = isSupervisor ? 'TENANT_USER' : parseMemberRole(role);
    if (memberRole === 'SUPERVISOR' && !canGrantSupervisor(user.role)) {
      return NextResponse.json({ error: 'Apenas administradores podem dar nível de supervisor.' }, { status: 403 });
    }

    const supervisorId: string | null = isSupervisor ? user.id : null;

    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: memberRole,
        supervisorId,
      },
      select: { id: true, name: true, email: true, role: true, supervisorId: true, createdAt: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar membro.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canManageTeamUsers(user.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const { id, name, email, password, role } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID do usuário não informado.' }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: user.role === 'SUPERVISOR'
        ? { id, tenantId: user.tenantId, supervisorId: user.id }
        : { id, tenantId: user.tenantId },
      select: { id: true, name: true, email: true, role: true, supervisorId: true },
    });
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
    if (user.role === 'SUPERVISOR') {
      if (role && role !== 'TENANT_USER') {
        return NextResponse.json({ error: 'Supervisor não pode alterar nível de acesso.' }, { status: 403 });
      }
    } else if (role) {
      const nextRole = parseMemberRole(role);
      if (nextRole !== 'SUPERVISOR' && existing.role === 'SUPERVISOR') {
        const reports = await prisma.user.count({
          where: { tenantId: user.tenantId, supervisorId: existing.id },
        });
        if (reports > 0) {
          return NextResponse.json(
            { error: 'Transfira equipe deste supervisor antes de alterar seu nível.' },
            { status: 409 }
          );
        }
      }
      updateData.role = nextRole;
      if (nextRole !== 'TENANT_USER' || existing.role === 'SUPERVISOR') {
        updateData.supervisorId = null;
      }
    }
    if (password?.trim()) updateData.passwordHash = await bcrypt.hash(password.trim(), 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, supervisorId: true, createdAt: true },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar membro.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!canGrantSupervisor(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem remover membros.' }, { status: 403 });
  }

  const targetId = new URL(req.url).searchParams.get('id');
  if (!targetId) return NextResponse.json({ error: 'ID do usuário não informado.' }, { status: 400 });
  if (targetId === user.id) {
    return NextResponse.json({ error: 'Você não pode remover a sua própria conta.' }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: targetId, tenantId: user.tenantId },
    select: { id: true, name: true },
  });
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  const reports = await prisma.user.count({
    where: { tenantId: user.tenantId, supervisorId: target.id },
  });
  if (reports > 0) {
    return NextResponse.json(
      { error: 'Transfira equipe deste supervisor antes de removê-lo.' },
      { status: 409 }
    );
  }

  try {
    const absorbed = await prisma.$transaction(async (tx) => {
      const fromMember = await reassignClients(tx, {
        tenantId: user.tenantId,
        toUserId: user.id,
        fromUserId: target.id,
        historyTxt: `Carteira transferida para a mesa após saída de ${target.name}.`,
      });
      const orphans = await claimOrphanClients(tx, user.tenantId, user.id);
      await tx.user.delete({ where: { id: target.id } });
      return fromMember + orphans;
    });

    return NextResponse.json({ success: true, absorbedClients: absorbed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao remover membro.' }, { status: 500 });
  }
}
