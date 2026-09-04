'use client';

import { useEffect, useState } from 'react';
import {
  CASE_STAGES,
  CONTRACT_STATUSES,
  DOCUMENT_TYPES,
  DO_NOT_CONTACT_REASONS,
  stageByKey,
} from '@/lib/constants';
import { formatCpf, formatPhone, fmtDateShort, whatsappLink } from '@/lib/format';
import type { ClientRecord, InsuranceCase, TenantUser } from '@/lib/types';
import {
  X,
  User,
  Shield,
  CreditCard,
  FileText,
  Clock,
  MessageCircle,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

type Props = {
  client: ClientRecord;
  isNew: boolean;
  users: TenantUser[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onSaved: (client: ClientRecord) => void;
};

const emptyCase = (): Partial<InsuranceCase> => ({
  policyNumber: '',
  insurer: '',
  insuranceType: '',
  identifiedAt: '',
  quantity: 1,
  insuranceValue: null,
  obs: '',
  status: 'AGUARDANDO_CONTATO',
  contractStatus: 'PENDENTE',
  cancellationRequestedAt: '',
  cancellationConfirmedAt: '',
  cancellationNotes: '',
  expectedClientAmount: null,
  receivedClientAmount: null,
  clientReceivedAt: '',
  companyAmount: null,
  companyDueAt: '',
  companyPaidAmount: null,
  companyPaidAt: '',
  myCommission: null,
  documents: [],
});

function moneyInput(value: number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function ClientModal({ client, isNew, users, isAdmin, currentUserId, onClose, onSaved }: Props) {
  const [form, setForm] = useState(client);
  const [caseForm, setCaseForm] = useState<Partial<InsuranceCase>>(
    client.cases[0] || emptyCase()
  );
  const [selectedCaseId, setSelectedCaseId] = useState(client.cases[0]?.id || '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('APOLICE');
  const [cpfWarning, setCpfWarning] = useState('');

  useEffect(() => {
    setForm(client);
    setCaseForm(client.cases[0] || emptyCase());
    setSelectedCaseId(client.cases[0]?.id || '');
    setError('');
  }, [client]);

  const setClientField = (key: keyof ClientRecord, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCaseField = (key: string, value: unknown) => {
    setCaseForm((prev) => ({ ...prev, [key]: value }));
  };

  const lookupCpf = async () => {
    const digits = String(form.cpf || '').replace(/\D/g, '');
    if (digits.length !== 11 || !isNew) return;
    const res = await fetch(`/api/clients?cpf=${digits}`);
    if (!res.ok) return;
    const list = await res.json();
    if (Array.isArray(list) && list[0]) {
      setCpfWarning(`CPF já cadastrado: ${list[0].name}. O cadastro vai abrir essa ficha.`);
    } else {
      setCpfWarning('');
    }
  };

  const persist = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        email: form.email,
        city: form.city,
        uf: form.uf,
        obs: form.obs,
        doNotContact: form.doNotContact,
        doNotContactReason: form.doNotContactReason,
        lastContactDate: form.lastContactDate,
        taskDate: form.taskDate,
        taskTime: form.taskTime,
        assignedUserId: form.assignedUserId || currentUserId,
        case: isNew ? caseForm : undefined,
      };

      let saved: ClientRecord;

      if (isNew) {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.status === 409 && data.client) {
          saved = data.client;
          setError('CPF já existia. Ficha carregada para incluir um novo caso.');
          onSaved(saved);
          setSaving(false);
          return;
        }
        if (!res.ok) {
          setError(data.error || 'Erro ao salvar.');
          setSaving(false);
          return;
        }
        saved = data;
      } else {
        const res = await fetch(`/api/clients/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao salvar cliente.');
          setSaving(false);
          return;
        }
        saved = data;

        if (selectedCaseId) {
          const caseRes = await fetch(`/api/cases/${selectedCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(caseForm),
          });
          const caseData = await caseRes.json();
          if (!caseRes.ok) {
            setError(caseData.error || 'Erro ao salvar caso.');
            setSaving(false);
            return;
          }
        }
        const refreshed = await fetch(`/api/clients/${form.id}`);
        saved = await refreshed.json();
      }

      onSaved(saved);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const addCase = async () => {
    if (isNew) {
      setError('Salve o cliente antes de adicionar outro caso.');
      return;
    }
    const res = await fetch(`/api/clients/${form.id}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emptyCase()),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erro ao criar caso.');
      return;
    }
    const refreshed = await fetch(`/api/clients/${form.id}`);
    const saved = await refreshed.json();
    setForm(saved);
    setSelectedCaseId(data.id);
    setCaseForm(data);
    onSaved(saved);
  };

  const addNote = async () => {
    if (!note.trim() || isNew) return;
    const res = await fetch(`/api/clients/${form.id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txt: note.trim() }),
    });
    if (res.ok) {
      setNote('');
      const refreshed = await fetch(`/api/clients/${form.id}`);
      const saved = await refreshed.json();
      setForm(saved);
      onSaved(saved);
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedCaseId) {
      setError('Salve o caso antes de anexar arquivos.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', docType);
      const res = await fetch(`/api/cases/${selectedCaseId}/documents`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha no upload.');
      } else {
        const refreshed = await fetch(`/api/clients/${form.id}`);
        const saved = await refreshed.json();
        setForm(saved);
        const nextCase = saved.cases.find((c: InsuranceCase) => c.id === selectedCaseId);
        if (nextCase) setCaseForm(nextCase);
        onSaved(saved);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (docId: string) => {
    if (!selectedCaseId) return;
    await fetch(`/api/cases/${selectedCaseId}/documents/${docId}`, { method: 'DELETE' });
    const refreshed = await fetch(`/api/clients/${form.id}`);
    const saved = await refreshed.json();
    setForm(saved);
    const nextCase = saved.cases.find((c: InsuranceCase) => c.id === selectedCaseId);
    if (nextCase) setCaseForm(nextCase);
    onSaved(saved);
  };

  const selectCase = (id: string) => {
    const found = form.cases.find((c) => c.id === id);
    setSelectedCaseId(id);
    if (found) setCaseForm(found);
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-grabber" />

        {/* Sticky Header */}
        <div className="modal-header-sticky">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="truncate text-base sm:text-lg">{isNew ? 'Novo Cliente / Caso' : form.name || 'Ficha do Cliente'}</h3>
              {!isNew && selectedCaseId && caseForm.status && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold shrink-0"
                  style={{
                    backgroundColor: `var(${stageByKey(caseForm.status).color}-bg)`,
                    color: `var(${stageByKey(caseForm.status).color})`,
                    border: `1px solid var(${stageByKey(caseForm.status).color})`,
                  }}
                >
                  {stageByKey(caseForm.status).title}
                </span>
              )}
              {form.doNotContact && (
                <span className="prio-badge quente text-[10px] shrink-0">Não Contatar</span>
              )}
            </div>
            {!isNew && (
              <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[var(--ink-soft)] truncate">
                <span>CPF {formatCpf(form.cpf) || 'Não informado'}</span>
                {form.phone && <span>· {formatPhone(form.phone)}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {form.phone && (
              <a
                className="wa-quick-btn shrink-0"
                href={whatsappLink(form.phone)}
                target="_blank"
                rel="noreferrer"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--line-strong)] transition-colors shrink-0"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {cpfWarning && (
            <div className="mb-4 p-3.5 rounded-xl bg-[var(--c-semresp-bg)] border border-[var(--c-semresp)] text-[var(--c-semresp)] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{cpfWarning}</span>
            </div>
          )}

          {/* HIERARQUIA 1: IDENTIDADE DO CLIENTE */}
          <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]">
              <User className="w-4 h-4 text-[var(--c-primeiro)]" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                1. Identidade & Contato do Titular
              </h4>
            </div>

            <div className="row2">
              <div className="field">
                <label>Nome Completo</label>
                <input value={form.name} onChange={(e) => setClientField('name', e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div className="field">
                <label>CPF Único</label>
                <input
                  value={form.cpf}
                  onChange={(e) => setClientField('cpf', e.target.value)}
                  onBlur={lookupCpf}
                  placeholder="000.000.000-00"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label>Telefone / Celular</label>
                <input value={form.phone} onChange={(e) => setClientField('phone', e.target.value)} placeholder="(00) 00000-0000" className="font-mono" />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input value={form.email} onChange={(e) => setClientField('email', e.target.value)} placeholder="cliente@email.com" />
              </div>
              <div className="field">
                <label>Operador Responsável</label>
                <select
                  value={form.assignedUserId || currentUserId}
                  onChange={(e) => setClientField('assignedUserId', e.target.value)}
                  disabled={!isAdmin}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label>Cidade</label>
                <input value={form.city} onChange={(e) => setClientField('city', e.target.value)} />
              </div>
              <div className="field">
                <label>UF</label>
                <input value={form.uf} maxLength={2} onChange={(e) => setClientField('uf', e.target.value.toUpperCase())} placeholder="SP" className="font-mono uppercase" />
              </div>
              <div className="field">
                <label>Último Contato Realizado</label>
                <input type="date" value={form.lastContactDate || ''} onChange={(e) => setClientField('lastContactDate', e.target.value)} />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label>Agendamento de Retorno</label>
                <input type="date" value={form.taskDate || ''} onChange={(e) => setClientField('taskDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Horário</label>
                <input type="time" value={form.taskTime || ''} onChange={(e) => setClientField('taskTime', e.target.value)} />
              </div>
              <div className="field">
                <label>Trava de Contato</label>
                <select
                  value={form.doNotContact ? form.doNotContactReason || 'OUTRO' : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      doNotContact: Boolean(v),
                      doNotContactReason: v || null,
                    }));
                  }}
                >
                  <option value="">Pode contatar normalmente</option>
                  {DO_NOT_CONTACT_REASONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      Não contatar — {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field mb-0">
              <label>Observações do Titular</label>
              <textarea value={form.obs} onChange={(e) => setClientField('obs', e.target.value)} placeholder="Anotações gerais do perfil do cliente..." />
            </div>
          </div>

          {/* HIERARQUIA 2: CASOS E APÓLICES */}
          <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--c-followup)]" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                  2. Casos & Apólices de Seguros ({form.cases.length || 1})
                </h4>
              </div>
              {!isNew && (
                <button className="btn btn-ghost btn-small" type="button" onClick={addCase}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar Outro Caso
                </button>
              )}
            </div>

            {!isNew && form.cases.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {form.cases.map((c) => {
                  const isActive = selectedCaseId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`case-chip ${isActive ? 'active' : ''}`}
                      onClick={() => selectCase(c.id)}
                    >
                      <span className="font-bold">{c.insurer || 'Sem seguradora'}</span>
                      <span className="opacity-70 font-mono text-xs">{c.policyNumber ? `· ${c.policyNumber}` : ''}</span>
                      <span className="text-[11px] font-sans">({stageByKey(c.status).title})</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="row2">
              <div className="field">
                <label>Seguradora</label>
                <input value={caseForm.insurer || ''} onChange={(e) => setCaseField('insurer', e.target.value)} placeholder="Ex: Porto Seguro, Bradesco..." />
              </div>
              <div className="field">
                <label>Número da Apólice / Código de Crédito</label>
                <input value={caseForm.policyNumber || ''} onChange={(e) => setCaseField('policyNumber', e.target.value)} placeholder="Ex: APL-9999" className="font-mono" />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label>Tipo do Seguro</label>
                <input value={caseForm.insuranceType || ''} onChange={(e) => setCaseField('insuranceType', e.target.value)} placeholder="Ex: Prestamista, Vida..." />
              </div>
              <div className="field">
                <label>Identificado em</label>
                <input type="date" value={caseForm.identifiedAt || ''} onChange={(e) => setCaseField('identifiedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Quantidade de Seguros</label>
                <input type="number" min={1} value={caseForm.quantity || 1} onChange={(e) => setCaseField('quantity', Number(e.target.value))} className="font-mono" />
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>Etapa do Funil Operacional</label>
                <select value={caseForm.status || 'AGUARDANDO_CONTATO'} onChange={(e) => setCaseField('status', e.target.value)}>
                  {CASE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status do Termo / Contrato</label>
                <select value={caseForm.contractStatus || 'PENDENTE'} onChange={(e) => setCaseField('contractStatus', e.target.value)}>
                  {CONTRACT_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* HIERARQUIA 3: DEMONSTRATIVO FINANCEIRO E CANCELAMENTO */}
          <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]">
              <CreditCard className="w-4 h-4 text-[var(--accent-lime)]" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                3. Demonstrativo Financeiro & Cancelamento
              </h4>
            </div>

            {/* Grid de Valores com destaque fintech */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="field mb-0">
                <label className="text-[var(--accent-lime)] font-bold">Valor do Seguro (Base R$)</label>
                <input
                  value={moneyInput(caseForm.insuranceValue)}
                  onChange={(e) => setCaseField('insuranceValue', e.target.value)}
                  placeholder="0,00"
                  className="font-mono font-bold text-[var(--accent-lime)] tabular-nums"
                />
              </div>
              <div className="field mb-0">
                <label>Valor Previsto ao Cliente</label>
                <input
                  value={moneyInput(caseForm.expectedClientAmount)}
                  onChange={(e) => setCaseField('expectedClientAmount', e.target.value)}
                  placeholder="0,00"
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="field mb-0">
                <label>Valor Recebido pelo Cliente</label>
                <input
                  value={moneyInput(caseForm.receivedClientAmount)}
                  onChange={(e) => setCaseField('receivedClientAmount', e.target.value)}
                  placeholder="0,00"
                  className="font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label>Data Recebimento Cliente</label>
                <input type="date" value={caseForm.clientReceivedAt || ''} onChange={(e) => setCaseField('clientReceivedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Comissão da Empresa (R$)</label>
                <input value={moneyInput(caseForm.companyAmount)} onChange={(e) => setCaseField('companyAmount', e.target.value)} placeholder="0,00" className="font-mono tabular-nums" />
              </div>
              <div className="field">
                <label>Pago à Empresa (R$)</label>
                <input value={moneyInput(caseForm.companyPaidAmount)} onChange={(e) => setCaseField('companyPaidAmount', e.target.value)} placeholder="0,00" className="font-mono tabular-nums" />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label className="text-[var(--accent-teal)] font-bold">Minha Comissão (R$)</label>
                <input value={moneyInput(caseForm.myCommission)} onChange={(e) => setCaseField('myCommission', e.target.value)} placeholder="0,00" className="font-mono font-bold text-[var(--accent-teal)] tabular-nums" />
              </div>
              <div className="field">
                <label>Vencimento Empresa</label>
                <input type="date" value={caseForm.companyDueAt || ''} onChange={(e) => setCaseField('companyDueAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Data Pagamento Empresa</label>
                <input type="date" value={caseForm.companyPaidAt || ''} onChange={(e) => setCaseField('companyPaidAt', e.target.value)} />
              </div>
            </div>

            <hr className="border-[var(--line)] my-3" />

            <div className="row3">
              <div className="field">
                <label>Cancelamento Solicitado em</label>
                <input type="date" value={caseForm.cancellationRequestedAt || ''} onChange={(e) => setCaseField('cancellationRequestedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Cancelamento Confirmado em</label>
                <input type="date" value={caseForm.cancellationConfirmedAt || ''} onChange={(e) => setCaseField('cancellationConfirmedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Notas de Cancelamento</label>
                <input value={caseForm.cancellationNotes || ''} onChange={(e) => setCaseField('cancellationNotes', e.target.value)} placeholder="Protocolo, atendente..." />
              </div>
            </div>

            <div className="field mb-0">
              <label>Observações Gerais do Caso</label>
              <textarea value={caseForm.obs || ''} onChange={(e) => setCaseField('obs', e.target.value)} placeholder="Detalhes operacionais específicos desta apólice..." />
            </div>
          </div>

          {/* HIERARQUIA 4: DOCUMENTOS DO CASO */}
          {!isNew && selectedCaseId && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]">
                <FileText className="w-4 h-4 text-[var(--c-primeiro)]" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                  4. Documentos & Anexos do Caso
                </h4>
              </div>

              <div className="flex gap-2 mb-3 items-center flex-wrap">
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-auto">
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <label className="btn btn-ghost btn-small cursor-pointer">
                  <span>Selecionar Arquivo</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {uploading && <span className="text-xs font-mono text-[var(--accent-teal)]">Transmitindo arquivo...</span>}
              </div>

              {(caseForm.documents || []).length === 0 && (
                <div className="text-xs text-[var(--ink-muted)] italic py-2">
                  Nenhum arquivo anexado a esta apólice.
                </div>
              )}

              <div className="space-y-2">
                {(caseForm.documents || []).map((d) => (
                  <div key={d.id} className="doc-row">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[var(--c-primeiro)] shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--ink)]">{d.filename}</div>
                        <div className="text-[11px] text-[var(--ink-soft)] font-mono">
                          {DOCUMENT_TYPES.find((t) => t.key === d.type)?.title || d.type} · {(d.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <a className="btn btn-ghost btn-small" href={`/api/cases/${selectedCaseId}/documents/${d.id}`} download>
                        <Download className="w-3 h-3" /> Baixar
                      </a>
                      <button className="btn btn-danger btn-small" type="button" onClick={() => removeDoc(d.id)}>
                        <Trash2 className="w-3 h-3" /> Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HIERARQUIA 5: HISTÓRICO & AUDITORIA */}
          {!isNew && (
            <div className="p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]">
                <Clock className="w-4 h-4 text-[var(--accent-teal)]" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                  5. Linha do Tempo & Histórico Operacional
                </h4>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  className="flex-1 min-w-0"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Registrar nota de contato, tentativa, objeção ou retorno..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNote();
                    }
                  }}
                />
                <button className="btn btn-ghost shrink-0 min-h-[44px]" type="button" onClick={addNote}>
                  Registrar
                </button>
              </div>

              <div className="timeline">
                {(form.history || []).length === 0 ? (
                  <div className="text-xs text-[var(--ink-muted)] italic py-2">
                    Nenhuma nota registrada até o momento.
                  </div>
                ) : (
                  (form.history || []).map((h) => (
                    <div key={h.id} className="timeline-item">
                      <div className="time">{h.time}</div>
                      <div className="txt">{h.txt}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="modal-actions">
          <div className="modal-cpf-meta">
            {!isNew && (
              <span className="text-xs text-[var(--ink-soft)] font-mono">
                Cadastro vinculado ao CPF {formatCpf(form.cpf)}
              </span>
            )}
          </div>
          <div className="right">
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn" type="button" onClick={persist} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
