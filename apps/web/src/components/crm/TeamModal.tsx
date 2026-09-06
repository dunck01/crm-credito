import { useState } from 'react';
import type { TenantUser } from '@/lib/types';
import { Users, X, UserPlus, Shield, User, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { ModalOverlay } from './ModalOverlay';

type Props = {
  users: TenantUser[];
  onClose: () => void;
  onChanged: () => void;
};

export function TeamModal({ users, onClose, onChanged }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TENANT_USER' | 'TENANT_ADMIN'>('TENANT_USER');
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<TenantUser | null>(null);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('TENANT_USER');
    setEditing(null);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tenant/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing?.id,
          name,
          email,
          password,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar.');
      } else {
        reset();
        onChanged();
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/tenant/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  return (
    <>
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-grabber" />

        <div className="modal-header-sticky">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--c-primeiro)]" />
            <h3 className="font-display text-lg font-bold m-0 text-[var(--ink)]">
              Equipe Operacional
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={save} className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] mb-5 space-y-3">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[var(--line)]">
              <UserPlus className="w-4 h-4 text-[var(--accent-lime)]" />
              <span className="font-mono text-xs font-bold uppercase text-[var(--ink)]">
                {editing ? `Editar: ${editing.name}` : 'Cadastrar Novo Membro'}
              </span>
            </div>

            <div className="row2">
              <div className="field">
                <label>Nome do Operador</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Roberto Alves" required />
              </div>
              <div className="field">
                <label>Nível de Acesso</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'TENANT_USER' | 'TENANT_ADMIN')}>
                  <option value="TENANT_USER">Operador de Crédito</option>
                  <option value="TENANT_ADMIN">Administrador da Mesa</option>
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>E-mail de Login</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operador@restituicao.com" required />
              </div>
              <div className="field">
                <label>{editing ? 'Nova Senha (deixe em branco p/ manter)' : 'Senha de Acesso'}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required={!editing} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Gravando...' : editing ? 'Salvar Alterações' : 'Adicionar à Equipe'}
              </button>
              {editing && (
                <button className="btn btn-ghost" type="button" onClick={reset}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="space-y-2.5">
            <div className="font-mono text-xs uppercase text-[var(--ink-soft)] font-bold px-1 mb-2">
              Membros Ativos ({users.length})
            </div>
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--paper-elevated)] border border-[var(--line-strong)] flex items-center justify-center font-bold text-xs text-[var(--ink)]">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                      <span>{u.name}</span>
                      <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        u.role === 'TENANT_ADMIN'
                          ? 'bg-[var(--c-primeiro-bg)] text-[var(--c-primeiro)] border-[var(--c-primeiro)]'
                          : 'bg-[var(--c-followup-bg)] text-[var(--c-followup)] border-[var(--c-followup)]'
                      }`}>
                        {u.role === 'TENANT_ADMIN' ? 'Administrador' : 'Operador'}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[var(--ink-soft)] mt-0.5">{u.email}</div>
                  </div>
                </div>

                <div className="flex gap-1.5 ml-auto">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => {
                      setEditing(u);
                      setName(u.name);
                      setEmail(u.email);
                      setRole(u.role === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'TENANT_USER');
                      setPassword('');
                    }}
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button className="btn btn-danger btn-small" type="button" onClick={() => setPendingRemove(u)}>
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <span />
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </ModalOverlay>
      {pendingRemove && (
        <ConfirmDialog
          title="Remover membro?"
          message={`Remover ${pendingRemove.name}? A carteira dele passa para você, para nenhum cliente ficar sem responsável.`}
          confirmLabel="Remover membro"
          onCancel={() => setPendingRemove(null)}
          onConfirm={async () => {
            const id = pendingRemove.id;
            setPendingRemove(null);
            await remove(id);
          }}
        />
      )}
    </>
  );
}
