import { INSURANCE_TYPES, INSURERS, type InsuranceTypeKey, type InsurerKey } from './constants';
import { roundMoney } from './commission';

export type DevolutionMode = 'prorata' | 'prorata_bb' | 'full' | 'manual';

export type DevolutionEstimate = {
  amount: number | null;
  mode: DevolutionMode;
  remainingRatio: number | null;
  hint: string;
};

function fold(raw?: string | null) {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function normalizeInsurerKey(raw?: string | null): InsurerKey {
  const s = fold(raw);
  if (!s) return 'OTHER';
  if (/brasilseg|bb seguros|banco do brasil/.test(s)) return 'BANCO_DO_BRASIL';
  if (/bradesco/.test(s)) return 'BRADESCO';
  if (/\binter\b/.test(s)) return 'INTER';
  if (/santander/.test(s)) return 'SANTANDER';
  if (/caixa/.test(s)) return 'CAIXA';
  return 'OTHER';
}

export function normalizeTypeKey(raw?: string | null): InsuranceTypeKey {
  const s = fold(raw);
  if (!s) return 'OTHER';
  if (/prestamista|credito protegido/.test(s)) return 'PRESTAMISTA';
  if (/residencial/.test(s)) return 'RESIDENCIAL';
  if (/capitaliz/.test(s)) return 'CAPITALIZACAO';
  if (/previd/.test(s)) return 'PREVIDENCIA';
  if (/\bvida\b/.test(s)) return 'VIDA';
  return 'OTHER';
}

export function catalogInsurerTitle(raw?: string | null) {
  const key = normalizeInsurerKey(raw);
  return INSURERS.find((item) => item.key === key)?.title || '';
}

export function catalogTypeTitle(raw?: string | null) {
  const key = normalizeTypeKey(raw);
  return INSURANCE_TYPES.find((item) => item.key === key)?.title || '';
}

export function devolutionMode(insurer?: string | null, insuranceType?: string | null): DevolutionMode {
  const insurerKey = normalizeInsurerKey(insurer);
  const typeKey = normalizeTypeKey(insuranceType);
  const prorata = typeKey === 'PRESTAMISTA' || typeKey === 'VIDA';
  const full =
    typeKey === 'RESIDENCIAL' || typeKey === 'CAPITALIZACAO' || typeKey === 'PREVIDENCIA';

  if (insurerKey === 'SANTANDER' || insurerKey === 'CAIXA' || insurerKey === 'OTHER' || typeKey === 'OTHER') {
    return 'manual';
  }
  if (insurerKey === 'BRADESCO' || insurerKey === 'INTER') {
    if (prorata) return 'prorata';
    if (full) return 'full';
  }
  if (insurerKey === 'BANCO_DO_BRASIL') {
    if (prorata) return 'prorata_bb';
    if (full) return 'full';
  }
  return 'manual';
}

function parseIsoDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function remainingRatio(policyStartAt?: string | null, policyEndAt?: string | null, asOf = new Date()) {
  const start = parseIsoDate(policyStartAt);
  const end = parseIsoDate(policyEndAt);
  if (!start || !end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = asOf.getTime() - start.getTime();
  return Math.min(1, Math.max(0, 1 - elapsed / total));
}

export function estimateDevolution(input: {
  insurer?: string | null;
  insuranceType?: string | null;
  insuranceValue?: number | null;
  policyStartAt?: string | null;
  policyEndAt?: string | null;
}): DevolutionEstimate {
  const mode = devolutionMode(input.insurer, input.insuranceType);

  if (mode === 'manual') {
    const insurerKey = normalizeInsurerKey(input.insurer);
    const hint =
      insurerKey === 'SANTANDER' || insurerKey === 'CAIXA'
        ? 'Preenchimento manual — regra da seguradora não cadastrada.'
        : 'Selecione seguradora e tipo do catálogo, ou preencha a devolução manualmente.';
    return { amount: null, mode, remainingRatio: null, hint };
  }

  const value = input.insuranceValue;
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return { amount: null, mode, remainingRatio: null, hint: 'Informe o valor da apólice para calcular a devolução.' };
  }

  if (mode === 'full') {
    return {
      amount: roundMoney(value),
      mode,
      remainingRatio: 1,
      hint: 'Devolução integral do valor da apólice.',
    };
  }

  const remaining = remainingRatio(input.policyStartAt, input.policyEndAt);
  if (remaining == null) {
    return {
      amount: null,
      mode,
      remainingRatio: null,
      hint: 'Informe início e fim da vigência para o cálculo pró-rata.',
    };
  }

  const prorata = roundMoney(value * remaining);
  const amount = mode === 'prorata_bb' ? roundMoney(prorata * 0.8) : prorata;
  const pct = Math.round(remaining * 100);
  const hint =
    mode === 'prorata_bb'
      ? `Pró-rata da vigência (${pct}% restante), menos 20% (Banco do Brasil).`
      : `Pró-rata da vigência (${pct}% restante).`;

  return { amount, mode, remainingRatio: remaining, hint };
}
