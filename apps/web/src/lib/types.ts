import type { CaseStatusKey } from './constants';

export type TenantUser = {
  id: string;
  name: string;
  email: string;
  role: string;
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

export type InsuranceCase = {
  id: string;
  tenantId: string;
  clientId: string;
  policyNumber: string;
  insurer: string;
  insuranceType: string;
  identifiedAt: string;
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
};
