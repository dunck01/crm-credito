import { BANKS, BANK_ACCOUNT_TYPES, type BankAccountTypeKey } from './constants';
import type { ClientBankAccount } from './types';

const ACCOUNT_TYPES = new Set<string>(BANK_ACCOUNT_TYPES.map((item) => item.key));

export function emptyBankAccount(holderName = ''): ClientBankAccount {
  return {
    id: '',
    clientId: '',
    bankName: '',
    bankCode: '',
    agency: '',
    account: '',
    accountDigit: '',
    accountType: 'CORRENTE',
    holderName,
    isPrimary: false,
  };
}

export function catalogBank(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  const lower = raw.toLowerCase();
  return (
    BANKS.find(
      (bank) =>
        bank.title.toLowerCase() === lower ||
        bank.key.toLowerCase() === lower ||
        bank.code === digits
    ) || null
  );
}

export function formatBankAccount(account: Pick<ClientBankAccount, 'bankName' | 'agency' | 'account' | 'accountDigit' | 'accountType'>) {
  const number = account.accountDigit ? `${account.account}-${account.accountDigit}` : account.account;
  const type = BANK_ACCOUNT_TYPES.find((item) => item.key === account.accountType)?.title;
  return [account.bankName, type, account.agency && `ag. ${account.agency}`, number].filter(Boolean).join(' · ');
}

export function isCompleteBankAccount(account: Pick<ClientBankAccount, 'bankName' | 'agency' | 'account'>) {
  return Boolean(account.bankName.trim() && account.agency.trim() && account.account.trim());
}

export function serializeBankAccount(account: any): ClientBankAccount {
  return {
    id: account.id || '',
    clientId: account.clientId || '',
    bankName: account.bankName || '',
    bankCode: account.bankCode || '',
    agency: account.agency || '',
    account: account.account || '',
    accountDigit: account.accountDigit || '',
    accountType: account.accountType || 'CORRENTE',
    holderName: account.holderName || '',
    isPrimary: Boolean(account.isPrimary),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export type NormalizedBankAccount = {
  id?: string;
  bankName: string;
  bankCode: string | null;
  agency: string;
  account: string;
  accountDigit: string | null;
  accountType: BankAccountTypeKey;
  holderName: string | null;
  isPrimary: boolean;
};

export function normalizeBankAccountInput(raw: unknown, fallbackHolder = ''): NormalizedBankAccount | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const catalog = catalogBank(item.bankName) || catalogBank(item.bankCode);
  const bankName = catalog?.title || String(item.bankName || '').trim();
  const agency = String(item.agency || '').replace(/\s/g, '').trim();
  let account = String(item.account || '').replace(/\s/g, '').trim();
  let accountDigit = String(item.accountDigit || '').replace(/\s/g, '').trim();
  if (!accountDigit && /^\d+-\d$/.test(account)) {
    const [num, digit] = account.split('-');
    account = num;
    accountDigit = digit;
  }
  if (!bankName || !agency || !account) return null;

  const rawType = String(item.accountType || 'CORRENTE');
  const accountType = (ACCOUNT_TYPES.has(rawType) ? rawType : 'CORRENTE') as BankAccountTypeKey;
  const id = typeof item.id === 'string' && item.id && !item.id.startsWith('draft-') ? item.id : undefined;

  return {
    id,
    bankName,
    bankCode: catalog?.code || String(item.bankCode || '').replace(/\D/g, '').slice(0, 3) || null,
    agency,
    account,
    accountDigit: accountDigit || null,
    accountType,
    holderName: String(item.holderName || fallbackHolder || '').trim() || null,
    isPrimary: Boolean(item.isPrimary),
  };
}


