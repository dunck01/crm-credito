'use client';

import { useCallback, useEffect, useState } from 'react';
import { CASE_STAGES, stageByKey } from '@/lib/constants';
import { fmtDateShort, fmtMoney, formatPhone, whatsappLink } from '@/lib/format';
import type { ClientRecord, SellerTeamStat, TeamClientView, TenantStatsPayload } from '@/lib/types';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Props = {
  clients: ClientRecord[];
  isAdmin?: boolean;
  canSeeTeam?: boolean;
  canSeeTeamContacts?: boolean;
  onOrphansClaimed?: () => void;
};

function parseTeamStats(data: TenantStatsPayload | SellerTeamStat[] | null): {
  team: SellerTeamStat[];
  orphanClientsCount: number;
} {
  if (Array.isArray(data)) return { team: data, orphanClientsCount: 0 };
  if (data && Array.isArray(data.team)) {
    return { team: data.team, orphanClientsCount: data.orphanClientsCount || 0 };
  }
  return { team: [], orphanClientsCount: 0 };
}

export function DashboardView({ clients, isAdmin, canSeeTeam, canSeeTeamContacts, onOrphansClaimed }: Props) {
  const [teamStats, setTeamStats] = useState<SellerTeamStat[]>([]);
  const [teamClients, setTeamClients] = useState<TeamClientView[]>([]);
  const [orphanClientsCount, setOrphanClientsCount] = useState(0);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadTeam = useCallback(() => {
    if (!canSeeTeam) return;
    setLoadingTeam(true);
    Promise.all([
      fetch('/api/tenant/stats'),
      canSeeTeamContacts ? fetch('/api/tenant/team/clients') : Promise.resolve(null),
    ])
      .then(async ([statsRes, clientsRes]) => {
        const statsData = statsRes.ok ? await statsRes.json() : null;
        const clientsData = clientsRes?.ok ? await clientsRes.json() : [];
        const parsed = parseTeamStats(statsData);
        setTeamStats(parsed.team);
        setOrphanClientsCount(parsed.orphanClientsCount);
        setTeamClients(Array.isArray(clientsData) ? clientsData : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingTeam(false));
  }, [canSeeTeam, canSeeTeamContacts]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const claimOrphans = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/tenant/wallet/claim-orphans', { method: 'POST' });
      if (res.ok) {
        loadTeam();
        onOrphansClaimed?.();
      }
    } finally {
      setClaiming(false);
    }
  };
  const allCases = clients.flatMap((c) => c.cases.map((caseItem) => ({ client: c, caseItem })));
  const countClientsWithStatus = (status: string) =>
    clients.filter((c) => c.cases.some((x) => x.status === status)).length;

  const awaitingContact = countClientsWithStatus('AGUARDANDO_CONTATO');
  const awaitingReply = countClientsWithStatus('AGUARDANDO_RESPOSTA');
  const converted = countClientsWithStatus('CONVERTIDO');
  const refused = countClientsWithStatus('NAO_ACEITOU');
  const blocked = clients.filter((c) => c.doNotContact).length;
  const cancel = allCases.filter((x) => x.caseItem.status === 'CANCELAMENTO').length;
  const pay = allCases.filter((x) => x.caseItem.status === 'PAGAMENTO').length;
  const done = allCases.filter((x) => x.caseItem.status === 'FINALIZADO').length;
  const lost = allCases.filter((x) => x.caseItem.status === 'PERDIDO').length;

  const totalInsurance = allCases.reduce((a, x) => a + (x.caseItem.insuranceValue || 0), 0);
  const received = allCases.reduce((a, x) => a + (x.caseItem.receivedClientAmount || 0), 0);
  const companyDue = allCases.reduce((a, x) => {
    const due = x.caseItem.companyAmount || 0;
    const paid = x.caseItem.companyPaidAmount || 0;
    return a + Math.max(due - paid, 0);
  }, 0);
  const commission = allCases.reduce((a, x) => a + (x.caseItem.myCommission || 0), 0);

  const money = [
    {
      label: 'Volume Total em Seguros',
      value: totalInsurance,
      accent: 'text-[var(--ink)]',
      sub: 'Base consolidada de apólices',
      icon: Briefcase,
    },
    {
      label: 'Recebido pelos Clientes',
      value: received,
      accent: 'text-[var(--accent-lime)]',
      sub: 'Valores restituídos e confirmados',
      icon: TrendingUp,
    },
    {
      label: 'Pendente com Seguradora / Empresa',
      value: companyDue,
      accent: 'text-[var(--c-semresp)]',
      sub: 'Aguardando repasse acordado',
      icon: Clock,
    },
    {
      label: 'Minha Comissão Apurada',
      value: commission,
      accent: 'text-[var(--accent-teal)]',
      sub: '50% da taxa da empresa (30% da devolução)',
      icon: DollarSign,
    },
  ];

  const kpis = [
    { label: 'Aguardando contato', value: awaitingContact, color: 'var(--c-primeiro)' },
    { label: 'Aguardando resposta', value: awaitingReply, color: 'var(--c-semresp)' },
    { label: 'Convertidos', value: converted, color: 'var(--c-recompra)' },
    { label: 'Não aceitou', value: refused, color: 'var(--c-mensal)' },
    { label: 'Trava Não contatar', value: blocked, color: 'var(--danger)' },
    { label: 'Em Cancelamento', value: cancel, color: 'var(--c-followup)' },
    { label: 'Ordem de Pagamento', value: pay, color: 'var(--c-semanal)' },
    { label: 'Processos Finalizados', value: done, color: 'var(--c-recompra)' },
    { label: 'Casos Perdidos', value: lost, color: 'var(--danger)' },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Seção Minha Carteira */}
      <div className="flex items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[var(--accent-teal)]" />
          <h2 className="font-display text-base sm:text-lg font-bold m-0 text-[var(--ink)]">
            Minha Carteira
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--ink-soft)]">
          Métricas e produção individual
        </span>
      </div>

      {/* 4 Hero Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {money.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="bg-[var(--card-glass)] backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-5 shadow-sm hover:border-[var(--line-glow)] transition-colors relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)] truncate">
                  {m.label}
                </span>
                <span className="p-1.5 rounded-lg bg-[var(--paper-elevated)] border border-[var(--line)]">
                  <Icon className="w-4 h-4 text-[var(--ink-soft)]" />
                </span>
              </div>
              <div className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${m.accent} mt-1`}>
                {fmtMoney(m.value) || 'R$ 0,00'}
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-1.5 font-sans">
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Counts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-[var(--card-glass)] border border-[var(--line)] rounded-xl p-3 shadow-sm"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.color }} />
              <div className="text-[10.5px] font-sans font-semibold text-[var(--ink-soft)] truncate" title={k.label}>
                {k.label}
              </div>
            </div>
            <div className="font-mono text-xl font-bold text-[var(--ink)] tabular-nums">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Funil de Casos / Restituição */}
      <div className="bg-[var(--card-glass)] backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--line)] flex-wrap gap-2">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold m-0 text-[var(--ink)]">
              Esteira de Restituição de Crédito & Seguros
            </h3>
            <p className="text-xs text-[var(--ink-soft)] m-0 mt-0.5">
              Distribuição percentual e volume financeiro em cada trilho de operação
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--line-strong)] text-[var(--ink-soft)]">
            Total: {allCases.length} apólices
          </span>
        </div>

        <div className="space-y-4">
          {CASE_STAGES.map((stg) => {
            const count = allCases.filter((x) => x.caseItem.status === stg.key).length;
            const pct = allCases.length ? (count / allCases.length) * 100 : 0;
            const val = allCases
              .filter((x) => x.caseItem.status === stg.key)
              .reduce((a, x) => a + (x.caseItem.insuranceValue || 0), 0);

            return (
              <div key={stg.key} className="p-2.5 rounded-xl hover:bg-[var(--paper-elevated)] transition-colors">
                <div className="flex justify-between items-center text-xs mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: `var(${stg.color})` }} />
                    <strong className="text-[var(--ink)] font-sans text-sm font-semibold">{stg.title}</strong>
                  </div>
                  <div className="font-mono text-xs text-[var(--ink-soft)] flex items-center gap-3">
                    <span>{count} caso{count === 1 ? '' : 's'} ({pct.toFixed(0)}%)</span>
                    <span className="text-[var(--accent-lime)] font-bold tabular-nums">
                      {fmtMoney(val) || 'R$ 0,00'}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[var(--paper)] rounded-full overflow-hidden border border-[var(--line)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
                      backgroundColor: `var(${stg.color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && orphanClientsCount > 0 && (
        <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-bg)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="m-0 font-semibold text-sm text-[var(--danger)]">
              {orphanClientsCount} cadastro{orphanClientsCount === 1 ? '' : 's'} sem responsável
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--ink-soft)]">
              Ficaram sem dono (ex.: vendedor removido). Ao assumir, entram na sua carteira — nomes e CPF não aparecem aqui.
            </p>
          </div>
          <button
            type="button"
            className="btn shrink-0"
            onClick={claimOrphans}
            disabled={claiming}
          >
            {claiming ? 'Assumindo…' : 'Assumir na minha carteira'}
          </button>
        </div>
      )}

      {/* Seção Mesa Operacional (Agregados da Equipe) */}
      {canSeeTeam && (
        <div className="bg-[var(--card-glass)] backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--c-primeiro)]" />
                <h3 className="font-display text-base sm:text-lg font-bold m-0 text-[var(--ink)]">
                  {isAdmin ? 'Mesa Operacional (Números da Equipe)' : 'Minha Equipe (Números)'}
                </h3>
              </div>
              <p className="text-xs text-[var(--ink-soft)] m-0 mt-0.5">
                {isAdmin ? 'Agregados numéricos consolidados por vendedor' : 'Acompanhamento da produção dos operadores vinculados'}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--line-strong)] text-[var(--ink-soft)]">
              {teamStats.length} vendedor{teamStats.length === 1 ? '' : 'es'}
            </span>
          </div>

          {loadingTeam ? (
            <p className="font-mono text-xs text-[var(--ink-soft)] py-4 text-center">
              Carregando agregados da mesa...
            </p>
          ) : teamStats.length === 0 ? (
            <p className="font-mono text-xs text-[var(--ink-muted)] py-4 text-center">
              Nenhum dado agregado disponível.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] font-mono uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Vendedor</th>
                    <th className="py-2.5 px-3 text-right">Clientes</th>
                    <th className="py-2.5 px-3 text-right">Casos</th>
                    <th className="py-2.5 px-3 text-right">Vol. Seguros</th>
                    <th className="py-2.5 px-3 text-right">Recebido Cliente</th>
                    <th className="py-2.5 px-3 text-right">Comissão Empresa</th>
                    <th className="py-2.5 px-3 text-right">Comissão Vendedor</th>
                    <th className="py-2.5 px-3 text-right">Não Contatar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {teamStats.map((s) => (
                    <tr key={s.userId} className="hover:bg-[var(--paper-elevated)] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                        {s.clientsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                        {s.casesCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                        {fmtMoney(s.insuranceValue) || 'R$ 0,00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--accent-lime)] font-semibold">
                        {fmtMoney(s.receivedClientAmount) || 'R$ 0,00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--c-semresp)]">
                        {fmtMoney(s.companyAmount) || 'R$ 0,00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--accent-teal)] font-semibold">
                        {fmtMoney(s.myCommission) || 'R$ 0,00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--danger)]">
                        {s.doNotContactCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--line-strong)] font-bold bg-[var(--paper-elevated)]">
                    <td className="py-2.5 px-3 text-[var(--ink)] font-mono uppercase text-[10.5px]">
                       {isAdmin ? 'Total da Mesa' : 'Total da Equipe'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                      {teamStats.reduce((a, b) => a + b.clientsCount, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                      {teamStats.reduce((a, b) => a + b.casesCount, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--ink)]">
                      {fmtMoney(teamStats.reduce((a, b) => a + b.insuranceValue, 0)) || 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--accent-lime)]">
                      {fmtMoney(teamStats.reduce((a, b) => a + b.receivedClientAmount, 0)) || 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--c-semresp)]">
                      {fmtMoney(teamStats.reduce((a, b) => a + b.companyAmount, 0)) || 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--accent-teal)]">
                      {fmtMoney(teamStats.reduce((a, b) => a + b.myCommission, 0)) || 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--danger)]">
                      {teamStats.reduce((a, b) => a + b.doNotContactCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {canSeeTeamContacts && (
        <div className="bg-[var(--card-glass)] backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--c-primeiro)]" />
                <h3 className="font-display text-base sm:text-lg font-bold m-0 text-[var(--ink)]">
                  Contatos da equipe
                </h3>
              </div>
              <p className="text-xs text-[var(--ink-soft)] m-0 mt-0.5">
                Visualização somente leitura · nenhuma ação altera carteira ou funil
              </p>
            </div>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--line-strong)] text-[var(--ink-soft)]">
              {teamClients.length} contato{teamClients.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingTeam ? (
            <p className="font-mono text-xs text-[var(--ink-soft)] py-4 text-center">Carregando contatos...</p>
          ) : teamClients.length === 0 ? (
            <p className="font-mono text-xs text-[var(--ink-muted)] py-4 text-center">Nenhum contato ativo na equipe.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {teamClients.map((client) => {
                const currentCase = client.cases[0];
                const totalValue = client.cases.reduce((sum, item) => sum + (item.insuranceValue || 0), 0);
                return (
                  <div key={client.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[var(--ink)] truncate">{client.name}</div>
                        <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                          Responsável: {client.assignedUser?.name || 'Sem responsável'}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-bold text-[var(--accent-lime)] tabular-nums shrink-0">
                        {fmtMoney(totalValue) || 'R$ 0,00'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[var(--ink-soft)]">
                      {client.phone && (
                        <a className="font-mono hover:text-[var(--accent-teal)]" href={whatsappLink(client.phone)} target="_blank" rel="noreferrer">
                          {formatPhone(client.phone)}
                        </a>
                      )}
                      {client.email && <span className="truncate">{client.email}</span>}
                      {client.city && <span>{[client.city, client.uf].filter(Boolean).join('/')}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--line)] text-[11px]">
                      <span className="segment-tag">{currentCase ? stageByKey(currentCase.status).title : 'Sem caso'}</span>
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
      )}
    </div>
  );
}
