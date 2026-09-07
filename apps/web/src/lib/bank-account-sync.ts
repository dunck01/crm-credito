import { prisma } from '@crm-credito/database';
import { normalizeBankAccountInput, type NormalizedBankAccount } from './bank-account';

export async function syncClientBankAccounts(
  clientId: string,
  incoming: unknown,
  fallbackHolder = ''
) {
  if (!Array.isArray(incoming)) return;

  const normalized = incoming
    .map((item) => normalizeBankAccountInput(item, fallbackHolder))
    .filter((item): item is NormalizedBankAccount => Boolean(item));

  if (normalized.length && !normalized.some((item) => item.isPrimary)) {
    normalized[0].isPrimary = true;
  }
  if (normalized.filter((item) => item.isPrimary).length > 1) {
    let seen = false;
    for (const item of normalized) {
      if (item.isPrimary && seen) item.isPrimary = false;
      else if (item.isPrimary) seen = true;
    }
  }

  const existing = await prisma.clientBankAccount.findMany({
    where: { clientId },
    select: { id: true },
  });
  const keepIds = new Set(normalized.map((item) => item.id).filter(Boolean) as string[]);
  const toDelete = existing.filter((item) => !keepIds.has(item.id)).map((item) => item.id);

  if (toDelete.length) {
    await prisma.clientBankAccount.deleteMany({
      where: { clientId, id: { in: toDelete } },
    });
  }

  for (const item of normalized) {
    const data = {
      bankName: item.bankName,
      bankCode: item.bankCode,
      agency: item.agency,
      account: item.account,
      accountDigit: item.accountDigit,
      accountType: item.accountType,
      holderName: item.holderName,
      isPrimary: item.isPrimary,
    };
    if (item.id && existing.some((row) => row.id === item.id)) {
      await prisma.clientBankAccount.update({ where: { id: item.id }, data });
    } else {
      await prisma.clientBankAccount.create({ data: { ...data, clientId } });
    }
  }
}

export async function resolveOwnedBankAccountId(clientId: string, bankAccountId: unknown) {
  if (bankAccountId === undefined) return undefined;
  const id = String(bankAccountId || '').trim();
  if (!id) return null;
  const account = await prisma.clientBankAccount.findFirst({
    where: { id, clientId },
    select: { id: true },
  });
  return account?.id || null;
}
