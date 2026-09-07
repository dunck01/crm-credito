'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CASE_STAGES,
  CONTRACT_STATUSES,
  DOCUMENT_TYPES,
  DO_NOT_CONTACT_REASONS,
  INSURANCE_TYPES,
  INSURERS,
  stageByKey,
} from '@/lib/constants';
import {
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  fmtMoney,
  maskCpfCnpj,
  maskPhone,
  maskCep,
  whatsappLink,
} from '@/lib/format';
import { devolutionBase, splitCommission } from '@/lib/commission';
import { catalogInsurerTitle, catalogTypeTitle, estimateDevolution } from '@/lib/devolution';
import { formatBankAccount, isCompleteBankAccount } from '@/lib/bank-account';
import type { ClientRecord, InsuranceCase } from '@/lib/types';
import { POLICY_FIELD_LABELS, type ParsedBankAccount, type ParsedPolicy } from '@/lib/policy-parse';
import { BankAccountsEditor } from './BankAccountsEditor';
import { ConfirmDialog } from './ConfirmDialog';
import { MoneyInput } from './MoneyInput';
import { ModalOverlay } from './ModalOverlay';
import { PolicyPdfImport } from './PolicyPdfImport';
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
  MapPin,
  Loader2,
} from 'lucide-react';

type Props = {
  client: ClientRecord;
  isNew: boolean;
  currentUserName?: string;
  onClose: () => void;
  onSaved: (client: ClientRecord) => void;
  onDeleted?: () => void;
};

const emptyCase = (): Partial<InsuranceCase> => ({
  bankAccountId: '',
  policyNumber: '',
  insurer: '',
  insuranceType: '',
  identifiedAt: '',
  policyStartAt: '',
  policyEndAt: '',
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

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void | Promise<void>;
};

function applyDevolution(next: Partial<InsuranceCase>, manual: boolean): Partial<InsuranceCase> {
  if (manual) {
    const split = splitCommission(
      devolutionBase({
        receivedClientAmount: next.receivedClientAmount,
        expectedClientAmount: next.expectedClientAmount,
      })
    );
    return { ...next, companyAmount: split.companyAmount, myCommission: split.myCommission };
  }
  const estimate = estimateDevolution({
    insurer: next.insurer,
    insuranceType: next.insuranceType,
    insuranceValue: next.insuranceValue,
    policyStartAt: next.policyStartAt,
    policyEndAt: next.policyEndAt,
  });
  const expected = estimate.amount;
  const split = splitCommission(
    devolutionBase({
      receivedClientAmount: next.receivedClientAmount,
      expectedClientAmount: expected,
    })
  );
  return {
    ...next,
    expectedClientAmount: expected,
    companyAmount: split.companyAmount,
    myCommission: split.myCommission,
  };
}

function CatalogField({
  options,
  value,
  onChange,
  otherLabel,
}: {
  options: readonly { key: string; title: string }[];
  value: string;
  onChange: (next: string) => void;
  otherLabel: string;
}) {
  const [forceOther, setForceOther] = useState(false);
  const matched = options.some((item) => item.title === value);
  const showOther = !matched && (forceOther || Boolean(value));
  const selectValue = showOther ? '__other__' : matched ? value : '';
  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            setForceOther(true);
            if (matched) onChange('');
            return;
          }
          setForceOther(false);
          onChange(e.target.value);
        }}
      >
        <option value="">Selecionar</option>
        {options.map((item) => (
          <option key={item.key} value={item.title}>
            {item.title}
          </option>
        ))}
        <option value="__other__">{otherLabel}</option>
      </select>
      {showOther && (
        <input
          className="mt-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Informe o nome"
        />
      )}
    </>
  );
}

export function ClientModal({ client, isNew, currentUserName, onClose, onSaved, onDeleted }: Props) {
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
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pendingPolicyFile, setPendingPolicyFile] = useState<File | null>(null);
  const [bankFromPolicy, setBankFromPolicy] = useState(false);
  const [policyFilled, setPolicyFilled] = useState<Set<string>>(new Set());
  const [pdfImport, setPdfImport] = useState<{
    filename: string;
    filledLabels: string[];
    missingLabels: string[];
    warning: string | null;
  } | null>(null);
  const [devolutionManual, setDevolutionManual] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    setForm(client);
    setCaseForm(client.cases[0] || emptyCase());
    setSelectedCaseId(client.cases[0]?.id || '');
    setError('');
    const existingCepMatch = client.obs?.match(/\b(\d{5}-?\d{3})\b/);
    setCep(existingCepMatch ? maskCep(existingCepMatch[1]) : '');
    setCepFeedback(null);
    setPolicyFilled(new Set());
    setPdfImport(null);
    setPendingPolicyFile(null);
    setBankFromPolicy(false);
    setDevolutionManual(false);
    setConfirm(null);
  }, [client]);

  const devolution = useMemo(
    () =>
      estimateDevolution({
        insurer: caseForm.insurer,
        insuranceType: caseForm.insuranceType,
        insuranceValue: caseForm.insuranceValue,
        policyStartAt: caseForm.policyStartAt,
        policyEndAt: caseForm.policyEndAt,
      }),
    [
      caseForm.insurer,
      caseForm.insuranceType,
      caseForm.insuranceValue,
      caseForm.policyStartAt,
      caseForm.policyEndAt,
    ]
  );

  const isDirty = useMemo(() => {
    if (isNew) {
      return Boolean(
        form.name ||
          form.cpf ||
          form.phone ||
          caseForm.insurer ||
          caseForm.policyNumber ||
          caseForm.insuranceValue ||
          pendingPolicyFile ||
          (form.bankAccounts || []).some((item) => isCompleteBankAccount(item))
      );
    }
    const origin = client.cases.find((item) => item.id === selectedCaseId) || client.cases[0] || emptyCase();
    return (
      form.name !== client.name ||
      form.cpf !== client.cpf ||
      form.phone !== client.phone ||
      form.email !== client.email ||
      form.city !== client.city ||
      form.uf !== client.uf ||
      form.obs !== client.obs ||
      form.doNotContact !== client.doNotContact ||
      form.taskDate !== client.taskDate ||
      (caseForm.insurer || '') !== (origin.insurer || '') ||
      (caseForm.policyNumber || '') !== (origin.policyNumber || '') ||
      (caseForm.insuranceType || '') !== (origin.insuranceType || '') ||
      (caseForm.insuranceValue ?? null) !== (origin.insuranceValue ?? null) ||
      (caseForm.expectedClientAmount ?? null) !== (origin.expectedClientAmount ?? null) ||
      (caseForm.policyStartAt || '') !== (origin.policyStartAt || '') ||
      (caseForm.policyEndAt || '') !== (origin.policyEndAt || '') ||
      (caseForm.status || '') !== (origin.status || '') ||
      (caseForm.bankAccountId || '') !== (origin.bankAccountId || '') ||
      Boolean(pendingPolicyFile) ||
      JSON.stringify(form.bankAccounts || []) !== JSON.stringify(client.bankAccounts || [])
    );
  }, [isNew, form, caseForm, client, selectedCaseId, pendingPolicyFile]);

  const requestClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirm({
      title: 'Fechar sem salvar?',
      message: 'Há alterações que ainda não foram gravadas. Se fechar agora, esse preenchimento será perdido.',
      confirmLabel: 'Fechar mesmo assim',
      danger: true,
      action: onClose,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirm) {
        setConfirm(null);
        return;
      }
      requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, isDirty, onClose]);

  const clearPolicyMark = (key: string) => {
    setPolicyFilled((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const fromPolicy = (key: string) => policyFilled.has(key);
  const fieldClass = (key: string) => (fromPolicy(key) ? 'field policy-filled' : 'field');

  const setClientField = (key: keyof ClientRecord, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearPolicyMark(String(key));
  };

  const setCaseField = (key: string, value: unknown) => {
    const sourceKeys = ['insurer', 'insuranceType', 'insuranceValue', 'policyStartAt', 'policyEndAt'];
    if (key === 'expectedClientAmount') setDevolutionManual(true);
    if (sourceKeys.includes(key)) setDevolutionManual(false);
    setCaseForm((prev) => {
      const next = { ...prev, [key]: value };
      const manual = key === 'expectedClientAmount' ? true : sourceKeys.includes(key) ? false : devolutionManual;
      return applyDevolution(next, manual);
    });
    clearPolicyMark(key);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCpfCnpj(e.target.value);
    setClientField('cpf', masked);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setClientField('phone', masked);
  };

  const handleCepChange = async (val: string, fromPdf = false) => {
    const masked = maskCep(val);
    setCep(masked);
    if (!fromPdf) clearPolicyMark('cep');
    const clean = digitsOnly(masked);
    if (clean.length === 8) {
      setCepLoading(true);
      setCepFeedback(null);
      try {
        let res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        let data = res.ok ? await res.json() : null;
        if (!data || data.erro) {
          const bRes = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`);
          if (bRes.ok) {
            const bData = await bRes.json();
            data = {
              localidade: bData.city,
              uf: bData.state,
              logradouro: bData.street,
              bairro: bData.neighborhood,
            };
          }
        }

        if (data && !data.erro && data.localidade) {
          setForm((prev) => {
            const updated = {
              ...prev,
              city: data.localidade,
              uf: (data.uf || '').toUpperCase(),
            };
            const addressLine = [data.logradouro, data.bairro].filter(Boolean).join(', ');
            if (addressLine) {
              if (!prev.obs) {
                updated.obs = `Endereço: ${addressLine} - CEP ${masked}`;
              } else if (!prev.obs.includes(masked)) {
                updated.obs = `${prev.obs.trim()}\nEndereço: ${addressLine} - CEP ${masked}`;
              }
            }
            return updated;
          });

          const full = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`]
            .filter(Boolean)
            .join(' · ');
          setCepFeedback({ message: full, type: 'success' });
        } else {
          setCepFeedback({ message: 'CEP não localizado na base postal.', type: 'error' });
        }
      } catch {
        setCepFeedback({ message: 'Erro ao consultar CEP automaticamente.', type: 'error' });
      } finally {
        setCepLoading(false);
      }
    } else {
      setCepFeedback(null);
    }
  };

  const lookupCpf = async (cpfValue = form.cpf) => {
    const digits = digitsOnly(cpfValue);
    if ((digits.length !== 11 && digits.length !== 14) || !isNew) return;
    const res = await fetch(`/api/clients?cpf=${digits}`);
    if (!res.ok) return;
    const list = await res.json();
    if (Array.isArray(list) && list[0]) {
      setCpfWarning(`CPF/CNPJ já cadastrado na sua carteira: ${list[0].name}. O cadastro vai abrir essa ficha.`);
    } else {
      setCpfWarning('');
    }
  };

  const applyParsedBank = (parsed: ParsedBankAccount | null, holderName: string) => {
    if (!parsed || !parsed.agency || !parsed.account) return;
    const existing = (form.bankAccounts || []).find(
      (item) => item.agency === parsed.agency && item.account === parsed.account
    );
    if (existing) {
      setCaseForm((prev) => (prev.bankAccountId ? prev : { ...prev, bankAccountId: existing.id }));
      return;
    }
    const draftId = `draft-${Date.now()}`;
    setBankFromPolicy(true);
    setForm((prev) => ({
      ...prev,
      bankAccounts: [
        ...(prev.bankAccounts || []),
        {
          id: draftId,
          clientId: prev.id || '',
          bankName: parsed.bankName,
          bankCode: parsed.bankCode || '',
          agency: parsed.agency,
          account: parsed.account,
          accountDigit: parsed.accountDigit || '',
          accountType: 'CORRENTE',
          holderName,
          isPrimary: (prev.bankAccounts || []).length === 0,
        },
      ],
    }));
    setCaseForm((prev) => (prev.bankAccountId ? prev : { ...prev, bankAccountId: draftId }));
  };

  const attachPolicyFile = async (caseId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'APOLICE');
    const res = await fetch(`/api/cases/${caseId}/documents`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Os dados foram lidos, mas o PDF não pôde ser anexado.');
      return false;
    }
    return true;
  };

  const importPolicyPdf = async (file: File) => {
    setParsingPdf(true);
    setError('');
    setPdfImport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/clients/parse-policy', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível ler o PDF.');
        return;
      }

      const fields = (data.fields || {}) as ParsedPolicy;
      const filled = (data.filled || []) as (keyof ParsedPolicy)[];
      const filledLabels = filled.map((key) => POLICY_FIELD_LABELS[key]).filter(Boolean);
      setPolicyFilled(new Set(filled));
      setForm((prev) => ({
        ...prev,
        name: fields.name || prev.name,
        cpf: fields.cpf ? maskCpfCnpj(fields.cpf) : prev.cpf,
        phone: fields.phone ? maskPhone(fields.phone) : prev.phone,
        email: fields.email || prev.email,
        city: fields.city || prev.city,
        uf: fields.uf || prev.uf,
      }));
      setDevolutionManual(false);
      setCaseForm((prev) =>
        applyDevolution(
          {
            ...prev,
            policyNumber: fields.policyNumber || prev.policyNumber,
            insurer: catalogInsurerTitle(fields.insurer) || fields.insurer || prev.insurer,
            insuranceType: catalogTypeTitle(fields.insuranceType) || fields.insuranceType || prev.insuranceType,
            insuranceValue: fields.insuranceValue ?? prev.insuranceValue,
            identifiedAt: fields.identifiedAt || prev.identifiedAt,
            policyStartAt: fields.policyStartAt || prev.policyStartAt,
            policyEndAt: fields.policyEndAt || prev.policyEndAt,
          },
          false
        )
      );
      applyParsedBank(data.bankAccount || null, fields.name || form.name);
      if (data.bankAccount) filledLabels.push('Banco');

      if (!isNew && selectedCaseId) {
        const attached = await attachPolicyFile(selectedCaseId, file);
        setPendingPolicyFile(attached ? null : file);
        if (attached) {
          const refreshed = await fetch(`/api/clients/${form.id}`);
          if (refreshed.ok) {
            const saved = await refreshed.json();
            const nextCase = saved.cases.find((c: InsuranceCase) => c.id === selectedCaseId);
            if (nextCase) {
              setCaseForm((prev) => ({ ...prev, documents: nextCase.documents }));
            }
          }
        }
      } else {
        setPendingPolicyFile(file);
      }

      const important: (keyof ParsedPolicy)[] = ['name', 'cpf', 'policyNumber', 'phone'];
      setPdfImport({
        filename: data.filename || file.name,
        filledLabels,
        missingLabels: important
          .filter((key) => !filled.includes(key))
          .map((key) => POLICY_FIELD_LABELS[key]),
        warning: data.warning || null,
      });

      if (fields.cep) await handleCepChange(fields.cep, true);
      if (fields.cpf) await lookupCpf(fields.cpf);
    } catch {
      setError('Erro ao enviar o PDF. No celular, escolha o arquivo PDF (não uma foto da tela).');
    } finally {
      setParsingPdf(false);
    }
  };

  const persist = async () => {
    setSaving(true);
    setError('');
    try {
      const completeBanks = (form.bankAccounts || []).filter(isCompleteBankAccount);
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
        bankAccounts: completeBanks,
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
          setError('Este CPF já está na sua carteira. Ficha carregada para incluir um novo caso.');
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
          const wanted = completeBanks.find((item) => item.id && item.id === caseForm.bankAccountId);
          const resolvedBank =
            saved.bankAccounts.find((item) => item.id === caseForm.bankAccountId)?.id ||
            saved.bankAccounts.find(
              (item) => wanted && item.agency === wanted.agency && item.account === wanted.account
            )?.id ||
            saved.bankAccounts.find((item) => item.isPrimary)?.id ||
            saved.bankAccounts[0]?.id ||
            '';
          const caseRes = await fetch(`/api/cases/${selectedCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...caseForm, bankAccountId: resolvedBank }),
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

      const caseId = selectedCaseId || saved.cases[0]?.id;
      if (pendingPolicyFile && caseId) {
        const attached = await attachPolicyFile(caseId, pendingPolicyFile);
        if (attached) {
          setPendingPolicyFile(null);
          const refreshed = await fetch(`/api/clients/${saved.id}`);
          if (refreshed.ok) saved = await refreshed.json();
        }
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
    const primary = (form.bankAccounts || []).find((item) => item.isPrimary) || (form.bankAccounts || [])[0];
    const res = await fetch(`/api/clients/${form.id}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...emptyCase(),
        bankAccountId: primary && !primary.id.startsWith('draft-') ? primary.id : '',
      }),
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
    setDevolutionManual(false);
    if (found) setCaseForm(found);
  };

  const deleteSelectedCase = async () => {
    if (!selectedCaseId || isNew) return;
    const remaining = form.cases.filter((item) => item.id !== selectedCaseId);
    const label = [caseForm.insurer, caseForm.policyNumber].filter(Boolean).join(' · ') || 'apólice';
    await fetch(`/api/clients/${form.id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txt: `Caso ${label} excluído.` }),
    });
    const res = await fetch(`/api/cases/${selectedCaseId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Não foi possível excluir o caso.');
      return;
    }
    const refreshed = await fetch(`/api/clients/${form.id}`);
    const saved = await refreshed.json();
    setForm(saved);
    if (remaining.length) {
      setSelectedCaseId(remaining[0].id);
      setCaseForm(remaining[0]);
    } else {
      setSelectedCaseId('');
      setCaseForm(emptyCase());
    }
    onSaved(saved);
  };

  const deleteClient = async () => {
    if (isNew || !form.id) return;
    const res = await fetch(`/api/clients/${form.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Não foi possível excluir o cliente.');
      return;
    }
    onDeleted?.();
    onClose();
  };

  const askDeleteCase = () => {
    const label = [caseForm.insurer, caseForm.policyNumber].filter(Boolean).join(' · ') || 'esta apólice';
    const last = form.cases.length <= 1;
    setConfirm({
      title: last ? 'Excluir a última apólice?' : 'Excluir esta apólice?',
      message: last
        ? `Excluir ${label} remove o único caso deste cliente. Na sequência vamos perguntar se o cadastro do cliente também deve ser apagado. Não dá para desfazer.`
        : `Excluir ${label}? Documentos deste caso também saem. Não dá para desfazer.`,
      confirmLabel: 'Excluir apólice',
      danger: true,
      action: async () => {
        await deleteSelectedCase();
        if (last) {
          setConfirm({
            title: 'Excluir também o cliente?',
            message: `${form.name || 'Este cliente'} ficou sem apólice. Excluir o cadastro inteiro? Não dá para desfazer.`,
            confirmLabel: 'Excluir cliente',
            danger: true,
            action: deleteClient,
          });
        }
      },
    });
  };

  const askDeleteClient = () => {
    setConfirm({
      title: 'Excluir cliente?',
      message: `Excluir ${form.name || 'este cliente'} e todas as apólices/documentos? Não dá para desfazer.`,
      confirmLabel: 'Excluir cliente',
      danger: true,
      action: deleteClient,
    });
  };

  const askRemoveDoc = (docId: string, filename: string) => {
    setConfirm({
      title: 'Remover arquivo?',
      message: `Remover ${filename} desta apólice? Não dá para desfazer.`,
      confirmLabel: 'Remover arquivo',
      danger: true,
      action: () => removeDoc(docId),
    });
  };

  return (
    <>
    <ModalOverlay onClose={requestClose}>
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
                <span>CPF/CNPJ {formatCpfCnpj(form.cpf) || 'Não informado'}</span>
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
              onClick={requestClose}
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

          <PolicyPdfImport
            parsing={parsingPdf}
            filename={pdfImport?.filename || null}
            filledLabels={pdfImport?.filledLabels || []}
            missingLabels={pdfImport?.missingLabels || []}
            warning={pdfImport?.warning || null}
            pendingAttach={Boolean(pendingPolicyFile)}
            onPick={importPolicyPdf}
            onReject={setError}
          />

          {/* HIERARQUIA 1: IDENTIDADE DO CLIENTE */}
          <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]">
              <User className="w-4 h-4 text-[var(--c-primeiro)]" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
                1. Identidade & Contato do Titular
              </h4>
            </div>

            <div className="row2">
              <div className={fieldClass('name')}>
                <label>
                  Nome Completo
                  {fromPolicy('name') && <span className="policy-tag">apólice</span>}
                </label>
                <input value={form.name} onChange={(e) => setClientField('name', e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div className={fieldClass('cpf')}>
                <label>
                  CPF / CNPJ
                  {fromPolicy('cpf') && <span className="policy-tag">apólice</span>}
                </label>
                <input
                  value={form.cpf}
                  onChange={handleCpfChange}
                  onBlur={() => lookupCpf()}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="font-mono"
                  maxLength={18}
                />
              </div>
            </div>

            <div className="row3">
              <div className={fieldClass('phone')}>
                <label>
                  Telefone / Celular
                  {fromPolicy('phone') && <span className="policy-tag">apólice</span>}
                </label>
                <input
                  value={form.phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="font-mono"
                  maxLength={15}
                />
              </div>
              <div className={fieldClass('email')}>
                <label>
                  E-mail
                  {fromPolicy('email') && <span className="policy-tag">apólice</span>}
                </label>
                <input value={form.email} onChange={(e) => setClientField('email', e.target.value)} placeholder="cliente@email.com" />
              </div>
              <div className="field">
                <label>Operador Responsável</label>
                <input
                  type="text"
                  value={isNew ? (currentUserName || 'Você') : (form.assignedUser?.name || currentUserName || 'Você')}
                  disabled
                  readOnly
                  className="opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="row3">
              <div className={fieldClass('cep')}>
                <label className="flex items-center justify-between">
                  <span>
                    CEP
                    {fromPolicy('cep') && <span className="policy-tag">apólice</span>}
                  </span>
                  {cepLoading && (
                    <span className="text-[10px] font-mono text-[var(--accent-teal)] flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando...
                    </span>
                  )}
                </label>
                <input
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="font-mono"
                  maxLength={9}
                />
              </div>
              <div className={fieldClass('city')}>
                <label>
                  Cidade
                  {fromPolicy('city') && <span className="policy-tag">apólice</span>}
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setClientField('city', e.target.value)}
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div className={fieldClass('uf')}>
                <label>
                  UF
                  {fromPolicy('uf') && <span className="policy-tag">apólice</span>}
                </label>
                <input
                  value={form.uf}
                  maxLength={2}
                  onChange={(e) => setClientField('uf', e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="font-mono uppercase"
                />
              </div>
            </div>

            {cepFeedback && (
              <div
                className="-mt-2 mb-3 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border"
                style={{
                  backgroundColor: cepFeedback.type === 'success' ? 'var(--c-followup-bg)' : 'var(--danger-bg)',
                  color: cepFeedback.type === 'success' ? 'var(--c-followup)' : 'var(--danger)',
                  borderColor: cepFeedback.type === 'success' ? 'var(--c-followup)' : 'var(--danger)',
                }}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{cepFeedback.message}</span>
              </div>
            )}

            <div className="row3">
              <div className="field">
                <label>Último Contato Realizado</label>
                <input type="date" value={form.lastContactDate || ''} onChange={(e) => setClientField('lastContactDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Agendamento de Retorno</label>
                <input type="date" value={form.taskDate || ''} onChange={(e) => setClientField('taskDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Horário</label>
                <input type="time" value={form.taskTime || ''} onChange={(e) => setClientField('taskTime', e.target.value)} />
              </div>
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

            <div className="field mb-0">
              <label>Observações do Titular</label>
              <textarea value={form.obs} onChange={(e) => setClientField('obs', e.target.value)} placeholder="Anotações gerais do perfil do cliente..." />
            </div>
          </div>

          <BankAccountsEditor
            accounts={form.bankAccounts || []}
            holderName={form.name}
            fromPolicy={bankFromPolicy}
            onChange={(bankAccounts) => setForm((prev) => ({ ...prev, bankAccounts }))}
          />

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
                      <span className="font-bold">{c.insuranceType || c.insurer || 'Sem tipo'}</span>
                      <span className="opacity-70 font-mono text-xs">
                        {[c.insurer, c.policyNumber].filter(Boolean).join(' · ')}
                      </span>
                      <span className="text-[11px] font-sans">({stageByKey(c.status).title})</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="row2">
              <div className={fieldClass('insurer')}>
                <label>
                  Seguradora
                  {fromPolicy('insurer') && <span className="policy-tag">apólice</span>}
                </label>
                <CatalogField
                  options={INSURERS}
                  value={catalogInsurerTitle(caseForm.insurer) || caseForm.insurer || ''}
                  onChange={(next) => setCaseField('insurer', next)}
                  otherLabel="Outra"
                />
              </div>
              <div className={fieldClass('policyNumber')}>
                <label>
                  Número da Apólice / Código de Crédito
                  {fromPolicy('policyNumber') && <span className="policy-tag">apólice</span>}
                </label>
                <input value={caseForm.policyNumber || ''} onChange={(e) => setCaseField('policyNumber', e.target.value)} placeholder="Ex: APL-9999" className="font-mono" />
              </div>
            </div>

            <div className="row3">
              <div className={fieldClass('insuranceType')}>
                <label>
                  Tipo do Seguro
                  {fromPolicy('insuranceType') && <span className="policy-tag">apólice</span>}
                </label>
                <CatalogField
                  options={INSURANCE_TYPES}
                  value={catalogTypeTitle(caseForm.insuranceType) || caseForm.insuranceType || ''}
                  onChange={(next) => setCaseField('insuranceType', next)}
                  otherLabel="Outro"
                />
              </div>
              <div className={fieldClass('identifiedAt')}>
                <label>
                  Identificado em
                  {fromPolicy('identifiedAt') && <span className="policy-tag">apólice</span>}
                </label>
                <input type="date" value={caseForm.identifiedAt || ''} onChange={(e) => setCaseField('identifiedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Quantidade de Seguros</label>
                <input type="number" min={1} value={caseForm.quantity || 1} onChange={(e) => setCaseField('quantity', Number(e.target.value))} className="font-mono" />
              </div>
            </div>

            <div className="row2">
              <div className={fieldClass('policyStartAt')}>
                <label>
                  Vigência início
                  {fromPolicy('policyStartAt') && <span className="policy-tag">apólice</span>}
                </label>
                <input type="date" value={caseForm.policyStartAt || ''} onChange={(e) => setCaseField('policyStartAt', e.target.value)} />
              </div>
              <div className={fieldClass('policyEndAt')}>
                <label>
                  Vigência fim
                  {fromPolicy('policyEndAt') && <span className="policy-tag">apólice</span>}
                </label>
                <input type="date" value={caseForm.policyEndAt || ''} onChange={(e) => setCaseField('policyEndAt', e.target.value)} />
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

            <div className="field mb-0">
              <label>Conta para depósito desta apólice</label>
              <select
                value={caseForm.bankAccountId || ''}
                onChange={(e) => setCaseField('bankAccountId', e.target.value)}
              >
                <option value="">Selecionar conta do cliente</option>
                {(form.bankAccounts || []).filter(isCompleteBankAccount).map((account) => (
                  <option key={account.id} value={account.id}>
                    {formatBankAccount(account)}
                    {account.isPrimary ? ' · principal' : ''}
                  </option>
                ))}
              </select>
              {(form.bankAccounts || []).filter(isCompleteBankAccount).length === 0 && (
                <p className="m-0 mt-2 text-[11px] font-mono text-[var(--ink-soft)]">
                  Cadastre banco, agência e conta acima para vincular a restituição deste caso.
                </p>
              )}
              {(caseForm.status === 'PAGAMENTO' || caseForm.status === 'FINALIZADO') &&
                !caseForm.bankAccountId && (
                  <p className="m-0 mt-2 text-[11px] font-mono text-[var(--c-semresp)]">
                    Esta apólice está em pagamento. Vincule a conta do cliente para o depósito.
                  </p>
                )}
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
              <div className={`${fieldClass('insuranceValue')} mb-0`}>
                <label className="text-[var(--accent-lime)] font-bold">
                  Valor do Seguro (Base R$)
                  {fromPolicy('insuranceValue') && <span className="policy-tag">apólice</span>}
                </label>
                <MoneyInput
                  value={caseForm.insuranceValue}
                  onChange={(val) => setCaseField('insuranceValue', val)}
                  accentColor="var(--accent-lime)"
                  className="font-bold text-[var(--accent-lime)]"
                />
              </div>
              <div className="field mb-0">
                <label>Devolução prevista ao cliente</label>
                <MoneyInput
                  value={caseForm.expectedClientAmount}
                  onChange={(val) => setCaseField('expectedClientAmount', val)}
                />
              </div>
              <div className="field mb-0">
                <label>Devolução recebida pelo cliente</label>
                <MoneyInput
                  value={caseForm.receivedClientAmount}
                  onChange={(val) => setCaseField('receivedClientAmount', val)}
                />
              </div>
            </div>

            <p className="m-0 mb-3 text-[11px] font-mono text-[var(--ink-soft)] leading-relaxed">
              {devolution.hint}
              {devolutionManual ? ' Valor previsto editado manualmente.' : ''}
              {(() => {
                const base = devolutionBase({
                  receivedClientAmount: caseForm.receivedClientAmount,
                  expectedClientAmount: caseForm.expectedClientAmount,
                });
                if (!base) return null;
                const usingReceived = Boolean(caseForm.receivedClientAmount && caseForm.receivedClientAmount > 0);
                return (
                  <>
                    {' '}
                    Comissão sobre a {usingReceived ? 'devolução recebida' : 'devolução prevista'} ({fmtMoney(base)}
                    ): empresa 30% = {fmtMoney(caseForm.companyAmount)} · sua parte 50% dessa taxa ={' '}
                    {fmtMoney(caseForm.myCommission)}.
                  </>
                );
              })()}
            </p>

            <div className="row3">
              <div className="field">
                <label>Data Recebimento Cliente</label>
                <input type="date" value={caseForm.clientReceivedAt || ''} onChange={(e) => setCaseField('clientReceivedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Taxa da empresa (30%)</label>
                <MoneyInput
                  value={caseForm.companyAmount}
                  onChange={(val) => setCaseField('companyAmount', val)}
                />
              </div>
              <div className="field">
                <label>Pago à Empresa (R$)</label>
                <MoneyInput
                  value={caseForm.companyPaidAmount}
                  onChange={(val) => setCaseField('companyPaidAmount', val)}
                />
              </div>
            </div>

            <div className="row3">
              <div className="field">
                <label className="text-[var(--accent-teal)] font-bold">Sua comissão (50% da taxa)</label>
                <MoneyInput
                  value={caseForm.myCommission}
                  onChange={(val) => setCaseField('myCommission', val)}
                  accentColor="var(--accent-teal)"
                  className="font-bold text-[var(--accent-teal)]"
                />
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
                <label className="btn btn-ghost btn-small cursor-pointer relative overflow-hidden">
                  <span>Selecionar arquivo</span>
                  <input
                    type="file"
                    className="policy-drop-input"
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
                      <button className="btn btn-danger btn-small" type="button" onClick={() => askRemoveDoc(d.id, d.filename)}>
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
                Cadastro vinculado ao documento {formatCpfCnpj(form.cpf)}
              </span>
            )}
          </div>
          <div className="right flex flex-wrap gap-2 justify-end">
            {!isNew && selectedCaseId && (
              <button className="btn btn-danger btn-small" type="button" onClick={askDeleteCase}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir apólice
              </button>
            )}
            {!isNew && form.id && (
              <button className="btn btn-danger btn-small" type="button" onClick={askDeleteClient}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir cliente
              </button>
            )}
            <button className="btn btn-ghost" type="button" onClick={requestClose}>
              Cancelar
            </button>
            <button className="btn" type="button" onClick={persist} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger !== false}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const run = confirm.action;
            setConfirm(null);
            await run();
          }}
        />
      )}
    </>
  );
}
