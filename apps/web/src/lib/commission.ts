export const COMPANY_SHARE = 0.3;
export const OPERATOR_SHARE_OF_COMPANY = 0.5;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function devolutionBase(input: {
  receivedClientAmount?: number | null;
  expectedClientAmount?: number | null;
}) {
  const received = input.receivedClientAmount;
  if (received != null && received > 0) return received;
  const expected = input.expectedClientAmount;
  if (expected != null && expected > 0) return expected;
  return null;
}

export function splitCommission(devolution: number | null | undefined) {
  if (devolution == null || !Number.isFinite(devolution) || devolution <= 0) {
    return { companyAmount: null as number | null, myCommission: null as number | null };
  }
  const companyAmount = roundMoney(devolution * COMPANY_SHARE);
  const myCommission = roundMoney(companyAmount * OPERATOR_SHARE_OF_COMPANY);
  return { companyAmount, myCommission };
}
