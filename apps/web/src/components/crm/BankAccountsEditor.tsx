'use client';

import { Landmark, Plus, Star, Trash2 } from 'lucide-react';
import { BANKS, BANK_ACCOUNT_TYPES } from '@/lib/constants';
import { catalogBank, emptyBankAccount, isCompleteBankAccount } from '@/lib/bank-account';
import type { ClientBankAccount } from '@/lib/types';

type Props = {
  accounts: ClientBankAccount[];
  holderName: string;
  fromPolicy?: boolean;
  onChange: (next: ClientBankAccount[]) => void;
};

export function BankAccountsEditor({ accounts, holderName, fromPolicy, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<ClientBankAccount>) => {
    onChange(accounts.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const setBank = (index: number, value: string) => {
    if (value === '__other__') {
      updateAt(index, { bankName: '', bankCode: '' });
      return;
    }
    const catalog = catalogBank(value);
    updateAt(index, {
      bankName: catalog?.title || value,
      bankCode: catalog?.code || '',
    });
  };

  const addAccount = () => {
    const next = emptyBankAccount(holderName);
    next.id = `draft-${Date.now()}`;
    next.isPrimary = accounts.length === 0;
    onChange([...accounts, next]);
  };

  const removeAt = (index: number) => {
    const next = accounts.filter((_, i) => i !== index);
    if (next.length && !next.some((item) => item.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  const setPrimary = (index: number) => {
    onChange(accounts.map((item, i) => ({ ...item, isPrimary: i === index })));
  };

  return (
    <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[var(--accent-teal)]" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] m-0">
            Dados bancários do cliente
            {fromPolicy && <span className="policy-tag">apólice</span>}
          </h4>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={addAccount}>
          <Plus className="w-3.5 h-3.5" /> Adicionar conta
        </button>
      </div>

      <p className="m-0 mb-3 text-[11px] font-mono text-[var(--ink-soft)] leading-relaxed">
        O cliente pode ter mais de um banco. Vincule a conta usada na restituição de cada apólice no
        bloco do caso.
      </p>

      {accounts.length === 0 && (
        <div className="text-xs text-[var(--ink-muted)] italic py-2">
          Nenhuma conta cadastrada. Inclua banco, agência e conta para o pagamento.
        </div>
      )}

      <div className="space-y-3">
        {accounts.map((account, index) => {
          const matched = BANKS.some((bank) => bank.title === account.bankName);
          const selectValue = matched ? account.bankName : account.bankName ? '__other__' : '';
          return (
            <div key={account.id || `bank-${index}`} className="bank-card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  className={`bank-primary ${account.isPrimary ? 'is-on' : ''}`}
                  onClick={() => setPrimary(index)}
                >
                  <Star className="w-3.5 h-3.5" />
                  {account.isPrimary ? 'Conta principal' : 'Definir como principal'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => removeAt(index)}
                  aria-label="Remover conta"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="row2">
                <div className="field">
                  <label>Banco</label>
                  <select value={selectValue} onChange={(e) => setBank(index, e.target.value)}>
                    <option value="">Selecionar</option>
                    {BANKS.map((bank) => (
                      <option key={bank.key} value={bank.title}>
                        {bank.code} — {bank.title}
                      </option>
                    ))}
                    <option value="__other__">Outro</option>
                  </select>
                  {selectValue === '__other__' && (
                    <input
                      className="mt-2"
                      value={account.bankName}
                      onChange={(e) => updateAt(index, { bankName: e.target.value, bankCode: '' })}
                      placeholder="Nome do banco"
                    />
                  )}
                </div>
                <div className="field">
                  <label>Tipo da conta</label>
                  <select
                    value={account.accountType || 'CORRENTE'}
                    onChange={(e) => updateAt(index, { accountType: e.target.value })}
                  >
                    {BANK_ACCOUNT_TYPES.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Agência</label>
                  <input
                    value={account.agency}
                    onChange={(e) => updateAt(index, { agency: e.target.value })}
                    placeholder="0000"
                    className="font-mono"
                    inputMode="numeric"
                  />
                </div>
                <div className="field">
                  <label>Conta</label>
                  <input
                    value={account.account}
                    onChange={(e) => updateAt(index, { account: e.target.value })}
                    placeholder="00000"
                    className="font-mono"
                    inputMode="numeric"
                  />
                </div>
                <div className="field">
                  <label>Dígito</label>
                  <input
                    value={account.accountDigit}
                    onChange={(e) => updateAt(index, { accountDigit: e.target.value.slice(0, 2) })}
                    placeholder="0"
                    className="font-mono"
                    inputMode="numeric"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="field mb-0">
                <label>Titular (se diferente)</label>
                <input
                  value={account.holderName}
                  onChange={(e) => updateAt(index, { holderName: e.target.value })}
                  placeholder={holderName || 'Nome do titular da conta'}
                />
              </div>

              {!isCompleteBankAccount(account) && (account.bankName || account.agency || account.account) && (
                <p className="m-0 mt-2 text-[11px] font-mono text-[var(--c-semresp)]">
                  Preencha banco, agência e conta para gravar este registro.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
