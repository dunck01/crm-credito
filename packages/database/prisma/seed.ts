import { PrismaClient, CaseStatus, ContractStatus, DoNotContactReason } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function todayOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log('Iniciando seed do CRM Restituição...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { passwordHash },
    create: {
      name: 'Super Admin',
      email: 'admin@admin.com',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin:', superAdmin.email);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'restituicao' },
    update: { name: 'Restituição Seguros', status: 'ACTIVE', plan: 'PRO' },
    create: {
      name: 'Restituição Seguros',
      slug: 'restituicao',
      status: 'ACTIVE',
      plan: 'PRO',
      maxUsers: 10,
    },
  });
  console.log('Tenant:', tenant.name);

  const pedro = await prisma.user.upsert({
    where: { email: 'pedro@restituicao.com' },
    update: { tenantId: tenant.id, role: 'TENANT_ADMIN', passwordHash, name: 'Pedro' },
    create: {
      name: 'Pedro',
      email: 'pedro@restituicao.com',
      passwordHash,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('Admin do tenant:', pedro.email);

  const existingCount = await prisma.client.count({ where: { tenantId: tenant.id } });
  if (existingCount > 0) {
    console.log('Clientes de exemplo já existem, pulando cadastro demo.');
    return;
  }

  const maria = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      assignedUserId: pedro.id,
      name: 'Maria Silva',
      cpf: '52998224725',
      phone: '11987654321',
      email: 'maria.silva@email.com',
      city: 'São Paulo',
      uf: 'SP',
      lastContactDate: '',
      taskDate: todayOffset(0),
      obs: 'Lead da lista de setembro.',
      history: {
        create: [{ time: todayOffset(0), txt: 'Cliente cadastrada a partir da lista de identificação.' }],
      },
      cases: {
        create: {
          tenantId: tenant.id,
          policyNumber: 'APL-1001',
          insurer: 'Porto Seguro',
          insuranceType: 'Prestamista',
          identifiedAt: todayOffset(-2),
          quantity: 1,
          insuranceValue: 4800,
          status: CaseStatus.AGUARDANDO_CONTATO,
          expectedClientAmount: 3600,
          companyAmount: 960,
          myCommission: 240,
        },
      },
    },
  });

  const joao = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      assignedUserId: pedro.id,
      name: 'João Santos',
      cpf: '39053344705',
      phone: '21988776655',
      email: 'joao.santos@email.com',
      city: 'Rio de Janeiro',
      uf: 'RJ',
      lastContactDate: todayOffset(-20),
      taskDate: todayOffset(7),
      obs: 'Não aceitou no primeiro contato. Retorno combinado.',
      history: {
        create: [
          { time: todayOffset(-20), txt: 'Primeiro contato realizado. Cliente pediu para retornar no próximo mês.' },
        ],
      },
      cases: {
        create: {
          tenantId: tenant.id,
          policyNumber: 'APL-2044',
          insurer: 'Bradesco Seguros',
          insuranceType: 'Prestamista',
          identifiedAt: todayOffset(-25),
          quantity: 1,
          insuranceValue: 6200,
          status: CaseStatus.NAO_ACEITOU,
          expectedClientAmount: 4650,
          companyAmount: 1240,
          myCommission: 310,
        },
      },
    },
  });

  const ana = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      assignedUserId: pedro.id,
      name: 'Ana Costa',
      cpf: '11144477735',
      phone: '31999887766',
      city: 'Belo Horizonte',
      uf: 'MG',
      doNotContact: true,
      doNotContactReason: DoNotContactReason.PREJUIZO,
      lastContactDate: todayOffset(-90),
      obs: 'Não contatar. Histórico de prejuízo.',
      history: {
        create: [{ time: todayOffset(-90), txt: 'Marcado como não contatar: prejuízo.' }],
      },
      cases: {
        create: {
          tenantId: tenant.id,
          policyNumber: 'APL-0091',
          insurer: 'SulAmérica',
          insuranceType: 'Habitacional',
          identifiedAt: todayOffset(-120),
          quantity: 1,
          insuranceValue: 9100,
          status: CaseStatus.PERDIDO,
          contractStatus: ContractStatus.RECEBIDO,
        },
      },
    },
  });

  const carlos = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      assignedUserId: pedro.id,
      name: 'Carlos Lima',
      cpf: '85351346891',
      phone: '41991234567',
      email: 'carlos.lima@email.com',
      city: 'Curitiba',
      uf: 'PR',
      lastContactDate: todayOffset(-3),
      taskDate: todayOffset(1),
      obs: 'Já teve um caso finalizado. Novo seguro identificado.',
      history: {
        create: [
          { time: todayOffset(-60), txt: 'Caso anterior finalizado com pagamento à empresa.' },
          { time: todayOffset(-3), txt: 'Novo seguro identificado na lista mensal.' },
        ],
      },
      cases: {
        create: [
          {
            tenantId: tenant.id,
            policyNumber: 'APL-3301',
            insurer: 'Mapfre',
            insuranceType: 'Prestamista',
            identifiedAt: todayOffset(-80),
            quantity: 1,
            insuranceValue: 3500,
            status: CaseStatus.FINALIZADO,
            contractStatus: ContractStatus.CONFERIDO,
            cancellationRequestedAt: todayOffset(-70),
            cancellationConfirmedAt: todayOffset(-65),
            expectedClientAmount: 2625,
            receivedClientAmount: 2625,
            clientReceivedAt: todayOffset(-50),
            companyAmount: 700,
            companyPaidAmount: 700,
            companyPaidAt: todayOffset(-40),
            myCommission: 175,
          },
          {
            tenantId: tenant.id,
            policyNumber: 'APL-3302',
            insurer: 'Porto Seguro',
            insuranceType: 'Auto',
            identifiedAt: todayOffset(-3),
            quantity: 1,
            insuranceValue: 2100,
            status: CaseStatus.AGUARDANDO_CONTATO,
            expectedClientAmount: 1575,
            companyAmount: 420,
            myCommission: 105,
          },
        ],
      },
    },
  });

  console.log('Clientes demo:', maria.name, joao.name, ana.name, carlos.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
