import type { CaseStatusKey } from './constants';

export type TenantUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  supervisorId?: string | null;
  supervisorName?: string | null;
  createdAt?: string;
};

export type HistoryNote = {
  id: string;
  time: string;
  txt: string;
  createdAt?: string;
};

export type CaseDocumentMeta = {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type ClientBankAccount = {
  id: string;
  clientId: string;
  bankName: string;
  bankCode: string;
  agency: string;
  account: string;
  accountDigit: string;
  accountType: string;
  holderName: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InsuranceCase = {
  id: string;
  tenantId: string;
  clientId: string;
  bankAccountId: string;
  policyNumber: string;
  insurer: string;
  insuranceType: string;
  identifiedAt: string;
  policyStartAt: string;
  policyEndAt: string;
  quantity: number;
  insuranceValue: number | null;
  obs: string;
  status: CaseStatusKey | string;
  contractStatus: string;
  cancellationRequestedAt: string;
  cancellationConfirmedAt: string;
  cancellationNotes: string;
  expectedClientAmount: number | null;
  receivedClientAmount: number | null;
  clientReceivedAt: string;
  companyAmount: number | null;
  companyDueAt: string;
  companyPaidAmount: number | null;
  companyPaidAt: string;
  myCommission: number | null;
  createdAt?: string;
  updatedAt?: string;
  documents: CaseDocumentMeta[];
};

export type ClientRecord = {
  id: string;
  tenantId: string;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  city: string;
  uf: string;
  obs: string;
  doNotContact: boolean;
  doNotContactReason: string | null;
  lastContactDate: string;
  taskDate: string;
  taskTime: string;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
  history: HistoryNote[];
  cases: InsuranceCase[];
  bankAccounts: ClientBankAccount[];
};

export type SellerTeamStat = {
  userId: string;
  name: string;
  clientsCount: number;
  casesCount: number;
  statusCounts: Record<string, number>;
  insuranceValue: number;
  receivedClientAmount: number;
  companyAmount: number;
  myCommission: number;
  doNotContactCount: number;
};

export type TenantStatsPayload = {
  team: SellerTeamStat[];
  orphanClientsCount: number;
};

export type TeamClientView = {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  city: string;
  uf: string;
  doNotContact: boolean;
  taskDate: string;
  taskTime: string;
  assignedUser: { id: string; name: string } | null;
  cases: Array<{
    id: string;
    policyNumber: string;
    insurer: string;
    insuranceType: string;
    status: string;
    insuranceValue: number | null;
  }>;
};
