'use client';

import { useMemo, useState } from 'react';
import { formatLocalIsoDate, fmtDate, todayStr, formatPhone } from '@/lib/format';
import type { ClientRecord } from '@/lib/types';
import { ChevronLeft, ChevronRight, Clock, Calendar, AlertTriangle } from 'lucide-react';

type Props = {
  clients: ClientRecord[];
  onOpen: (client: ClientRecord) => void;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AgendaView({ clients, onOpen }: Props) {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(todayStr());

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const items: { key: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      items.push({ key: formatLocalIsoDate(d), inMonth: d.getMonth() === m - 1 });
    }
    return items;
  }, [month]);

  const byDay = useMemo(() => {
    const map: Record<string, ClientRecord[]> = {};
    clients.forEach((c) => {
      if (!c.taskDate) return;
      if (!map[c.taskDate]) map[c.taskDate] = [];
      map[c.taskDate].push(c);
    });
    return map;
  }, [clients]);

  const today = todayStr();
  const selected = byDay[selectedDay] || [];
  const overdue = clients.filter((c) => c.taskDate && c.taskDate < today);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-4">
      <div className="agenda-month-bar">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <strong className="font-display text-base sm:text-lg capitalize text-[var(--ink)]">
            {new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </strong>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {overdue.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdue.length} retorno{overdue.length === 1 ? '' : 's'} em atraso
            </span>
          )}
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-day-header">
            <span className="sm:hidden">{d.slice(0, 1)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {cells.map((cell) => {
          const count = (byDay[cell.key] || []).length;
          return (
            <div
              key={cell.key}
              className={`calendar-day-cell ${cell.inMonth ? '' : 'other-month'} ${cell.key === today ? 'is-today' : ''} ${cell.key === selectedDay ? 'active-selected' : ''}`}
              onClick={() => setSelectedDay(cell.key)}
            >
              <span className="day-num">{Number(cell.key.slice(8))}</span>
              {count > 0 && <span className="day-badge-count">{count}</span>}
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--card-glass)] backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2EE6A6]" />
            <h3 className="font-display text-base font-bold m-0 text-[var(--ink)]">
              Retornos Agendados em {fmtDate(selectedDay)}
            </h3>
          </div>
          <span className="font-mono text-xs text-[var(--ink-soft)]">
            {selected.length} compromisso{selected.length === 1 ? '' : 's'}
          </span>
        </div>

        {selected.length === 0 ? (
          <div className="text-center py-8 text-sm font-mono text-[var(--ink-muted)]">
            Nenhum contato ou retorno previsto para esta data.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selected.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--line-glow)] cursor-pointer transition-all hover:-translate-y-0.5"
                onClick={() => onOpen(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-[var(--ink)]">{c.name}</div>
                    <div className="font-mono text-xs text-[var(--ink-soft)] mt-0.5">
                      {formatPhone(c.phone) || 'Sem telefone'}
                    </div>
                  </div>
                  {c.taskTime && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-500/15 text-[#2EE6A6] border border-teal-500/25 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.taskTime}
                    </span>
                  )}
                </div>
                {c.cases[0]?.insurer && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="segment-tag text-[10.5px]">{c.cases[0].insurer}</span>
                    {c.cases[0].policyNumber && (
                      <span className="text-[11px] font-mono text-[var(--ink-soft)]">
                        {c.cases[0].policyNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
