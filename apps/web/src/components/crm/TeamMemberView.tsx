'use client';

import { useEffect, useState } from 'react';
import { stageByKey } from '@/lib/constants';
import { fmtDateShort, fmtMoney, formatPhone } from '@/lib/format';
import type { TeamClientView, TenantUser } from '@/lib/types';
import { AlertTriangle, Briefcase, Eye, X } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';

type Props = {
  member: TenantUser;
  onClose: () => void;
};

export function TeamMemberView({ member, onClose }: Props) {
  const [clients, setClients] = useState<TeamClientView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`/api/tenant/team/clients?userId=${encodeURIComponent(member.id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível carregar a carteira.');
        if (!cancelled) setClients(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro de conexão.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const cases = clients.flatMap((client) => client.cases);
  const totalValue = cases.reduce((sum, item) => sum + (item.insuranceValue || 0), 0);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-grabber" />
        <div className="modal-header-sticky">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-5 h-5 text-[var(--c-primeiro)] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold m-0 text-[var(--ink)] truncate">
                Visão de {member.name}
              </h3>
              <p className="m-0 text-[11px] text-[var(--ink-soft)]">Somente leitura</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
            aria-label="Fechar visão do membro"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
              <div className="text-[10px] uppercase font-mono text-[var(--ink-soft)]">Contatos</div>
              <div className="font-mono text-xl font-bold text-[var(--ink)] mt-1">{clients.length}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
              <div className="text-[10px] uppercase font-mono text-[var(--ink-soft)]">Volume</div>
              <div className="font-mono text-xl font-bold text-[var(--accent-lime)] mt-1">{fmtMoney(totalValue) || 'R$ 0,00'}</div>
            </div>
          </div>

          {loading ? (
            <p className="font-mono text-xs text-[var(--ink-soft)] py-8 text-center">Carregando carteira...</p>
          ) : error ? (
            <div className="p-3.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : clients.length === 0 ? (
            <p className="font-mono text-xs text-[var(--ink-muted)] py-8 text-center">Nenhum contato ativo nesta carteira.</p>
          ) : (
            <div className="space-y-2.5">
              {clients.map((client) => {
                const currentCase = client.cases[0];
                const clientValue = client.cases.reduce((sum, item) => sum + (item.insuranceValue || 0), 0);
                return (
                  <div key={client.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[var(--ink)] truncate">{client.name}</div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-[var(--ink-soft)]">
                          {client.phone && <span>{formatPhone(client.phone)}</span>}
                          {client.email && <span className="truncate">{client.email}</span>}
                          {client.city && <span>{[client.city, client.uf].filter(Boolean).join('/')}</span>}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-bold text-[var(--accent-lime)] tabular-nums shrink-0">
                        {fmtMoney(clientValue) || 'R$ 0,00'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--line)] text-[11px]">
                      <span className="segment-tag flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {currentCase ? stageByKey(currentCase.status).title : 'Sem caso'}
                      </span>
                      <span className="text-[var(--ink-muted)]">
                        {client.taskDate ? `Retorno ${fmtDateShort(client.taskDate)}` : 'Sem retorno agendado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <span className="text-[11px] text-[var(--ink-muted)]">Sem ações de edição nesta visão</span>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </ModalOverlay>
  );
}
