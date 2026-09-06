import { decimalNumber } from './format';

const documentSelect = {
  id: true,
  type: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;

export const clientInclude = {
  assignedUser: { select: { id: true, name: true, email: true } },
  history: { orderBy: { createdAt: 'desc' as const } },
  cases: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      documents: { select: documentSelect, orderBy: { createdAt: 'desc' as const } },
    },
  },
};

export function serializeCase(c: any) {
  return {
    ...c,
    policyNumber: c.policyNumber || '',
    insurer: c.insurer || '',
    insuranceType: c.insuranceType || '',
    identifiedAt: c.identifiedAt || '',
    policyStartAt: c.policyStartAt || '',
    policyEndAt: c.policyEndAt || '',
    quantity: c.quantity ?? 1,
    insuranceValue: c.insuranceValue == null ? null : decimalNumber(c.insuranceValue),
    obs: c.obs || '',
    cancellationRequestedAt: c.cancellationRequestedAt || '',
    cancellationConfirmedAt: c.cancellationConfirmedAt || '',
    cancellationNotes: c.cancellationNotes || '',
    expectedClientAmount: c.expectedClientAmount == null ? null : decimalNumber(c.expectedClientAmount),
    receivedClientAmount: c.receivedClientAmount == null ? null : decimalNumber(c.receivedClientAmount),
    clientReceivedAt: c.clientReceivedAt || '',
    companyAmount: c.companyAmount == null ? null : decimalNumber(c.companyAmount),
    companyDueAt: c.companyDueAt || '',
    companyPaidAmount: c.companyPaidAmount == null ? null : decimalNumber(c.companyPaidAmount),
    companyPaidAt: c.companyPaidAt || '',
    myCommission: c.myCommission == null ? null : decimalNumber(c.myCommission),
    documents: (c.documents || []).map((d: any) => ({
      id: d.id,
      type: d.type,
      filename: d.filename,
      mimeType: d.mimeType,
      size: d.size,
      createdAt: d.createdAt,
    })),
  };
}

export function serializeClient(c: any) {
  return {
    ...c,
    phone: c.phone || '',
    email: c.email || '',
    city: c.city || '',
    uf: c.uf || '',
    obs: c.obs || '',
    lastContactDate: c.lastContactDate || '',
    taskDate: c.taskDate || '',
    taskTime: c.taskTime || '',
    doNotContact: Boolean(c.doNotContact),
    doNotContactReason: c.doNotContactReason || null,
    isArchived: Boolean(c.isArchived),
    history: c.history || [],
    cases: (c.cases || []).map(serializeCase),
  };
}

export function emptyToNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}
