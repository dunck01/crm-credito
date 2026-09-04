'use client';

import { CASE_STAGES } from '@/lib/constants';
import { fmtMoney } from '@/lib/format';
import type { ClientRecord } from '@/lib/types';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';

type Props = {
  clients: ClientRecord[];
};

export function DashboardView({ clients }: Props) {
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
      sub: 'Comissão individual direta',
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
    </div>
  );
}
