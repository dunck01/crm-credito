export const CASE_STAGES = [
  { key: 'AGUARDANDO_CONTATO', title: 'Aguardando contato', color: '--c-primeiro' },
  { key: 'AGUARDANDO_RESPOSTA', title: 'Aguardando resposta', color: '--c-semresp' },
  { key: 'NAO_ACEITOU', title: 'Não aceitou', color: '--c-mensal' },
  { key: 'CONVERTIDO', title: 'Convertido', color: '--c-recompra' },
  { key: 'CANCELAMENTO', title: 'Cancelamento', color: '--c-followup' },
  { key: 'PAGAMENTO', title: 'Pagamento', color: '--c-semanal' },
  { key: 'FINALIZADO', title: 'Finalizado', color: '--c-recompra' },
  { key: 'PERDIDO', title: 'Perdido', color: '--danger' },
] as const;

export type CaseStatusKey = (typeof CASE_STAGES)[number]['key'];

export const CONTRACT_STATUSES = [
  { key: 'PENDENTE', title: 'Pendente' },
  { key: 'ENVIADO', title: 'Enviado ao cliente' },
  { key: 'RECEBIDO', title: 'Recebido' },
  { key: 'CONFERIDO', title: 'Conferido' },
] as const;

export const DOCUMENT_TYPES = [
  { key: 'APOLICE', title: 'Apólice' },
  { key: 'TERMO', title: 'Termo/contrato' },
  { key: 'COMPROVANTE', title: 'Comprovante' },
  { key: 'DOCUMENTO_CLIENTE', title: 'Documento do cliente' },
  { key: 'OUTRO', title: 'Outro' },
] as const;

export const DO_NOT_CONTACT_REASONS = [
  { key: 'PREJUIZO', title: 'Prejuízo' },
  { key: 'SOLICITACAO', title: 'Solicitação do cliente' },
  { key: 'OUTRO', title: 'Outro' },
] as const;

export const CONTACT_COLUMNS: CaseStatusKey[] = ['AGUARDANDO_CONTATO', 'AGUARDANDO_RESPOSTA'];

export const INSURERS = [
  { key: 'BRADESCO', title: 'Bradesco' },
  { key: 'INTER', title: 'Inter' },
  { key: 'BANCO_DO_BRASIL', title: 'Banco do Brasil' },
  { key: 'SANTANDER', title: 'Santander' },
  { key: 'CAIXA', title: 'Caixa Econômica' },
] as const;

export type InsurerKey = (typeof INSURERS)[number]['key'] | 'OTHER';

export const INSURANCE_TYPES = [
  { key: 'PRESTAMISTA', title: 'Prestamista' },
  { key: 'VIDA', title: 'Vida' },
  { key: 'RESIDENCIAL', title: 'Residencial' },
  { key: 'CAPITALIZACAO', title: 'Capitalização' },
  { key: 'PREVIDENCIA', title: 'Previdência' },
] as const;

export type InsuranceTypeKey = (typeof INSURANCE_TYPES)[number]['key'] | 'OTHER';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function isAdminRole(role?: string | null) {
  return role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN';
}

export function parseMemberRole(role?: string | null): 'TENANT_ADMIN' | 'TENANT_USER' {
  return role === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'TENANT_USER';
}

export function stageByKey(key: string) {
  return CASE_STAGES.find((s) => s.key === key) || CASE_STAGES[0];
}
