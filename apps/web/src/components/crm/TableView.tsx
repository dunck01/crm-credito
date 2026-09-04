'use client';

import { stageByKey } from '@/lib/constants';
import { formatCpf, formatPhone, fmtDateShort, fmtMoney, whatsappLink } from '@/lib/format';
import type { ClientRecord } from '@/lib/types';
import { MessageCircle, FileText, Clock, AlertTriangle } from 'lucide-react';

type Props = {
  clients: ClientRecord[];
  onOpen: (client: ClientRecord) => void;
};

function currentCase(c: ClientRecord) {
  return c.cases.find((x) => x.status !== 'FINALIZADO' && x.status !== 'PERDIDO') || c.cases[0];
}

export function TableView({ clients, onOpen }: Props) {
  return (
    <>
      <div className="mobile-client-list">
        {clients.length === 0 ? (
          <div className="text-center py-10 text-sm font-mono text-[var(--ink-muted)]">
            Nenhum cliente ou caso encontrado nos filtros.
          </div>
        ) : (
          clients.map((c) => {
            const openCase = currentCase(c);
            const today = new Date().toISOString().slice(0, 10);
            const overdue = Boolean(c.taskDate && c.taskDate < today);

            return (
              <button key={c.id} type="button" className="mobile-client-card" onClick={() => onOpen(c)}>
                <div className="card-main">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="name">{c.name}</p>
                    {c.doNotContact && (
                      <span className="prio-badge quente text-[9.5px]">Não contatar</span>
                    )}
                  </div>
                  <div className="meta">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{formatCpf(c.cpf)}</span>
                      {c.phone ? <span>· {formatPhone(c.phone)}</span> : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {openCase?.insurer && (
                        <span className="segment-tag text-[10.5px]">{openCase.insurer}</span>
                      )}
                      <span className="text-[11px] text-[var(--ink-soft)] font-sans font-medium">
                        {openCase ? stageByKey(openCase.status).title : 'Sem caso'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="value-side">
                  <div className="val">{fmtMoney(openCase?.insuranceValue) || '—'}</div>
                  {c.taskDate && (
                    <div className={`text-[10.5px] font-mono mt-1 flex items-center justify-end gap-1 ${
                      overdue ? 'text-[var(--danger)] font-bold' : 'text-[var(--ink-muted)]'
                    }`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{fmtDateShort(c.taskDate)}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="table-view-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente / CPF</th>
              <th>Contato</th>
              <th>Local</th>
              <th>Seguradora & Apólice</th>
              <th>Etapa Operacional</th>
              <th className="text-right">Valor Restituição</th>
              <th>Retorno</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[var(--ink-muted)] font-mono">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              clients.map((c) => {
                const openCase = currentCase(c);
                const stage = openCase ? stageByKey(openCase.status) : null;
                const today = new Date().toISOString().slice(0, 10);
                const overdue = Boolean(c.taskDate && c.taskDate < today);

                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => onOpen(c)}
                  >
                    <td>
                      <div className="font-bold text-[var(--ink)] flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.doNotContact && (
                          <span className="prio-badge quente text-[9px]">Não contatar</span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-[var(--ink-soft)] mt-0.5">
                        {formatCpf(c.cpf)}
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-xs text-[var(--ink)] flex items-center gap-2">
                        <span>{formatPhone(c.phone) || '—'}</span>
                        {c.phone && (
                          <a
                            href={whatsappLink(c.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2EE6A6] hover:opacity-80 p-0.5"
                            onClick={(e) => e.stopPropagation()}
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="text-xs text-[var(--ink-soft)]">
                      {[c.city, c.uf].filter(Boolean).join('/') || '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {openCase?.insurer ? (
                          <span className="segment-tag">{openCase.insurer}</span>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)]">—</span>
                        )}
                        {openCase?.policyNumber && (
                          <span className="credit-code text-[11px]">
                            <FileText className="w-3 h-3 text-[var(--c-primeiro)]" />
                            {openCase.policyNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {stage ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `var(${stage.color}-bg)`,
                            color: `var(${stage.color})`,
                            border: `1px solid var(${stage.color})`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: `var(${stage.color})` }}
                          />
                          {stage.title}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ink-muted)]">Sem caso</span>
                      )}
                    </td>
                    <td className="text-right font-mono font-bold text-sm text-[var(--accent-lime)] tabular-nums">
                      {fmtMoney(openCase?.insuranceValue) || '—'}
                    </td>
                    <td>
                      {c.taskDate ? (
                        <span className={`font-mono text-xs flex items-center gap-1 ${
                          overdue ? 'text-[var(--danger)] font-bold' : 'text-[var(--ink-soft)]'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {fmtDateShort(c.taskDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ink-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
