'use client';

import { useEffect, useRef, useState } from 'react';
import { CASE_STAGES, CONTACT_COLUMNS, type CaseStatusKey } from '@/lib/constants';
import { fmtDateShort, fmtMoney, formatPhone, whatsappLink } from '@/lib/format';
import type { ClientRecord, InsuranceCase } from '@/lib/types';
import { Calendar, Clock, FileText, MessageCircle, AlertTriangle } from 'lucide-react';

export type CaseCard = { client: ClientRecord; caseItem: InsuranceCase };

type Props = {
  cardsByStatus: Record<string, CaseCard[]>;
  dragOverKey: string | null;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (status: CaseStatusKey, caseId: string) => void;
  onDragOver: (key: string | null) => void;
  onOpen: (card: CaseCard) => void;
  onAdd: () => void;
};

export function KanbanBoard({
  cardsByStatus,
  dragOverKey,
  draggedId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onOpen,
  onAdd,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const updateScrollWidth = () => setBoardScrollWidth(board.scrollWidth);
    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);
    return () => window.removeEventListener('resize', updateScrollWidth);
  }, [cardsByStatus]);

  const syncScroll = (source: HTMLDivElement) => {
    const target = source === topScrollRef.current ? boardRef.current : topScrollRef.current;
    if (target && target.scrollLeft !== source.scrollLeft) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  return (
    <>
      <div className="board-scrollbar-wrap">
        <div className="board-scrollbar-caption">
          <span className="board-scrollbar-icon" aria-hidden="true">↔</span>
          <span>Arraste para navegar pelas colunas</span>
        </div>
        <div
          ref={topScrollRef}
          className="board-scrollbar-top"
          onScroll={(event) => syncScroll(event.currentTarget)}
          aria-label="Rolar funil horizontalmente"
        >
          <div style={{ width: `${boardScrollWidth}px` }} />
        </div>
      </div>

      <div
        ref={boardRef}
        className="board"
        onScroll={(event) => syncScroll(event.currentTarget)}
      >
        {CASE_STAGES.map((stage) => {
        const cards = cardsByStatus[stage.key] || [];
        const total = cards.reduce((acc, c) => acc + (c.caseItem.insuranceValue || 0), 0);
        return (
          <div
            key={stage.key}
            className={`column ${dragOverKey === stage.key ? 'drag-over' : ''}`}
            style={{ ['--stagecolor' as string]: `var(${stage.color})` }}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(stage.key);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const caseId = e.dataTransfer.getData('text/plain');
              onDrop(stage.key, caseId);
              onDragOver(null);
            }}
            onDragLeave={() => {
              if (dragOverKey === stage.key) onDragOver(null);
            }}
          >
            <div className="col-head">
              <div className="title-group">
                <span className="pip" />
                <span className="title">{stage.title}</span>
              </div>
              <span className="count">{cards.length}</span>
            </div>
            <div className="col-total-value">
              <span className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">Volume</span>
              <span className="tabular-nums">{fmtMoney(total) || 'R$ 0,00'}</span>
            </div>
            <div className="col-body">
              {cards.length === 0 && <div className="col-empty">Nenhum caso nesta etapa</div>}
              {cards.map((card) => {
                const today = new Date().toISOString().slice(0, 10);
                const overdue = Boolean(card.client.taskDate && card.client.taskDate < today);
                const isToday = Boolean(card.client.taskDate && card.client.taskDate === today);
                const isCancelamento = card.caseItem.status === 'CANCELAMENTO';
                const isPagamento = card.caseItem.status === 'PAGAMENTO';

                return (
                  <div
                    key={card.caseItem.id}
                    className={`card ${draggedId === card.caseItem.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', card.caseItem.id);
                      e.dataTransfer.effectAllowed = 'move';
                      onDragStart(card.caseItem.id);
                    }}
                    onDragEnd={onDragEnd}
                    onClick={() => onOpen(card)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="name truncate min-w-0 flex-1">{card.client.name}</p>
                      {card.client.phone && (
                        <a
                          className="wa-quick-btn shrink-0"
                          href={whatsappLink(card.client.phone)}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WA</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {card.caseItem.insurer && (
                        <span className="segment-tag">{card.caseItem.insurer}</span>
                      )}
                      {card.caseItem.policyNumber && (
                        <span className="credit-code" title="Código da apólice / crédito">
                          <FileText className="w-3 h-3 text-[var(--c-primeiro)]" />
                          {card.caseItem.policyNumber}
                        </span>
                      )}
                    </div>

                    {card.caseItem.insuranceValue ? (
                      <div className="val-tag">
                        <span className="text-[10px] text-[var(--ink-muted)] font-mono font-normal">RECUPERÁVEL</span>
                        <span>{fmtMoney(card.caseItem.insuranceValue)}</span>
                      </div>
                    ) : null}

                    {card.client.doNotContact && (
                      <div className="prio-badge quente mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Não contatar</span>
                      </div>
                    )}

                    {/* Microdetalhe de crédito: thin progress / tick marks na esteira de cancelamento/pagamento */}
                    {isCancelamento && (
                      <div className="credit-progress-bar" title="Esteira de cancelamento do seguro">
                        <div className="credit-tick done" title="Solicitado" />
                        <div className="credit-tick active" title="Em processamento na seguradora" />
                        <div className="credit-tick" title="Confirmação de cancelamento" />
                      </div>
                    )}

                    {isPagamento && (
                      <div className="credit-progress-bar" title="Esteira de liquidação e repasse">
                        <div className="credit-tick done" title="Cancelamento liquidado" />
                        <div className="credit-tick done" title="Crédito liberado" />
                        <div className="credit-tick active" title="Repasse de comissão" />
                      </div>
                    )}

                    {card.client.taskDate && (
                      <div className={`next ${overdue ? 'overdue' : ''}`}>
                        <span className="lbl flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Retorno
                        </span>
                        <span className="date flex items-center gap-1">
                          {isToday && <span className="text-[9px] px-1 rounded bg-[var(--c-followup-bg)] text-[var(--c-followup)] font-mono font-bold">HOJE</span>}
                          {overdue && <span className="text-[9px] px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)] font-mono font-bold">ATRASADO</span>}
                          <span>{fmtDateShort(card.client.taskDate)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {stage.key === CONTACT_COLUMNS[0] && (
              <button className="col-add" type="button" onClick={onAdd}>
                + Novo cliente / caso
              </button>
            )}
          </div>
        );
        })}
      </div>
    </>
  );
}
