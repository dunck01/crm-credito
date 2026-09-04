import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@crm-credito/database';
import * as bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { clients: true, users: true } },
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, slug, adminName, adminEmail, adminPassword, plan, maxUsers } = body;

    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const existingTenant = await prisma.tenant.findUnique({ where: { slug: normalizedSlug } });
    if (existingTenant) {
      return NextResponse.json({ error: 'Já existe uma empresa com este identificador (slug).' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: 'O e-mail informado já está cadastrado no sistema.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        slug: normalizedSlug,
        plan: plan || 'PRO',
        maxUsers: parseInt(maxUsers || '10', 10),
        status: 'ACTIVE',
        users: {
          create: {
            name: adminName || name,
            email: adminEmail.toLowerCase(),
            passwordHash,
            role: 'TENANT_ADMIN',
          },
        },
      },
      include: { users: true },
    });

    return NextResponse.json(newTenant, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao criar tenant.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tenantId, status } = body;
    if (!tenantId || !status) {
      return NextResponse.json({ error: 'TenantId e Status são obrigatórios.' }, { status: 400 });
    }
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar tenant.' }, { status: 500 });
  }
}
