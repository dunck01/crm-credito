'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { CalendarDays, Columns3, LayoutDashboard, LogOut, Moon, Plus, Search, Sun, Table2, Users } from 'lucide-react';
import { CASE_STAGES, CONTACT_COLUMNS, isAdminRole, type CaseStatusKey } from '@/lib/constants';
import { digitsOnly, normalizeSearch, todayStr } from '@/lib/format';
import type { ClientRecord, TenantUser } from '@/lib/types';
import { AgendaView } from './AgendaView';
import { ClientModal } from './ClientModal';
import { DashboardView } from './DashboardView';
import { KanbanBoard, type CaseCard } from './KanbanBoard';
import { TableView } from './TableView';
import { TeamModal } from './TeamModal';

type ViewMode = 'kanban' | 'table' | 'agenda' | 'dashboard';

const blankClient = (userId: string): ClientRecord => ({
  id: '',
  tenantId: '',
  assignedUserId: userId,
  name: '',
  cpf: '',
  phone: '',
  email: '',
  city: '',
  uf: '',
  obs: '',
  doNotContact: false,
  doNotContactReason: null,
  lastContactDate: '',
  taskDate: '',
  taskTime: '',
  isArchived: false,
  history: [],
  cases: [],
  bankAccounts: [],
});

export function CrmApp() {
  const sessionRes = useSession();
  const user = sessionRes?.data?.user as {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    tenantName?: string;
  };
  const isAdmin = isAdminRole(user?.role);
  const tenantName = user?.tenantName || 'CRM Restituição';

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [listFilter, setListFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [teamOpen, setTeamOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const currentUserId = user?.id || '';

  const fetchAll = useCallback(async () => {
    try {
      const promises: Promise<Response>[] = [fetch('/api/clients?archived=false')];
      if (isAdmin) {
        promises.push(fetch('/api/tenant/users'));
      }
      const [cRes, uRes] = await Promise.all(promises);
      if (cRes.ok) setClients(await cRes.json());
      if (uRes && uRes.ok) setUsers(await uRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('crm_theme') : null;
    if (savedTheme === 'light') {
      setDark(false);
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      setDark(true);
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  }, [fetchAll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalOpen) setTeamOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
      localStorage.setItem('crm_theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('crm_theme', 'light');
    }
  };

  const filteredClients = useMemo(() => {
    const q = normalizeSearch(search);
    const qDigits = digitsOnly(search);
    const today = todayStr();

    return clients.filter((c) => {
      if (listFilter === 'nao-contatar' && !c.doNotContact) return false;
      if (listFilter === 'retorno' && (!c.taskDate || c.taskDate > today)) return false;
      if (taskFilter === 'today' && c.taskDate !== today) return false;
      if (taskFilter === 'overdue' && !(c.taskDate && c.taskDate < today)) return false;
      if (ufFilter && (c.uf || '').toUpperCase() !== ufFilter) return false;
      if (cityFilter && normalizeSearch(c.city) !== normalizeSearch(cityFilter)) return false;
      if (insurerFilter && !c.cases.some((x) => normalizeSearch(x.insurer).includes(normalizeSearch(insurerFilter)))) {
        return false;
      }
      if (typeFilter && !c.cases.some((x) => normalizeSearch(x.insuranceType).includes(normalizeSearch(typeFilter)))) {
        return false;
      }
      if (statusFilter && !c.cases.some((x) => x.status === statusFilter)) return false;
      if (!q && !qDigits) return true;
      const blob = normalizeSearch(
        [c.name, c.email, c.city, c.phone, c.cpf, ...c.cases.map((x) => `${x.policyNumber} ${x.insurer} ${x.insuranceType}`)].join(' ')
      );
      const digits = digitsOnly(`${c.cpf}${c.phone}${c.cases.map((x) => x.policyNumber).join('')}`);
      return blob.includes(q) || (qDigits && digits.includes(qDigits));
    });
  }, [clients, search, listFilter, taskFilter, insurerFilter, statusFilter, ufFilter, cityFilter, typeFilter]);

  const cardsByStatus = useMemo(() => {
    const map: Record<string, CaseCard[]> = {};
    CASE_STAGES.forEach((s) => {
      map[s.key] = [];
    });
    filteredClients.forEach((client) => {
      client.cases.forEach((caseItem) => {
        if (listFilter !== 'nao-contatar' && client.doNotContact && CONTACT_COLUMNS.includes(caseItem.status as CaseStatusKey)) {
          return;
        }
        if (statusFilter && caseItem.status !== statusFilter) return;
        if (insurerFilter && !normalizeSearch(caseItem.insurer).includes(normalizeSearch(insurerFilter))) return;
        if (typeFilter && !normalizeSearch(caseItem.insuranceType).includes(normalizeSearch(typeFilter))) return;
        if (!map[caseItem.status]) map[caseItem.status] = [];
        map[caseItem.status].push({ client, caseItem });
      });
    });
    return map;
  }, [filteredClients, listFilter, statusFilter, insurerFilter, typeFilter]);

  const insurers = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => c.cases.forEach((x) => x.insurer && set.add(x.insurer)));
    return Array.from(set).sort();
  }, [clients]);

  const types = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => c.cases.forEach((x) => x.insuranceType && set.add(x.insuranceType)));
    return Array.from(set).sort();
  }, [clients]);

  const ufs = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => c.uf && set.add(c.uf.toUpperCase()));
    return Array.from(set).sort();
  }, [clients]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (!c.city) return;
      if (ufFilter && (c.uf || '').toUpperCase() !== ufFilter) return;
      set.add(c.city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clients, ufFilter]);

  const caseMatchesFilters = (x: { status: string; insurer: string; insuranceType: string }) => {
    if (statusFilter && x.status !== statusFilter) return false;
    if (insurerFilter && !normalizeSearch(x.insurer).includes(normalizeSearch(insurerFilter))) return false;
    if (typeFilter && !normalizeSearch(x.insuranceType).includes(normalizeSearch(typeFilter))) return false;
    return true;
  };

  const listClients = useMemo(
    () =>
      filteredClients.map((c) => ({
        ...c,
        cases: c.cases.filter(caseMatchesFilters),
      })),
    [filteredClients, statusFilter, insurerFilter, typeFilter]
  );

  const hasActiveFilters = Boolean(
    search || listFilter || taskFilter || insurerFilter || statusFilter || ufFilter || cityFilter || typeFilter
  );

  const clearFilters = () => {
    setSearch('');
    setListFilter('');
    setTaskFilter('');
    setInsurerFilter('');
    setStatusFilter('');
    setUfFilter('');
    setCityFilter('');
    setTypeFilter('');
  };

  const openNew = () => {
    setSelected(blankClient(currentUserId));
    setIsNew(true);
    setModalOpen(true);
  };

  const openClient = (client: ClientRecord) => {
    setSelected(client);
    setIsNew(false);
    setModalOpen(true);
  };

  const openCard = (card: CaseCard) => {
    const ordered = {
      ...card.client,
      cases: [card.caseItem, ...card.client.cases.filter((c) => c.id !== card.caseItem.id)],
    };
    openClient(ordered);
  };

  const moveCase = async (status: CaseStatusKey, caseId: string) => {
    const id = caseId || draggedId;
    if (!id) return;
    const origin = clients.flatMap((c) => c.cases).find((x) => x.id === id);
    if (!origin || origin.status === status) {
      setDraggedId(null);
      return;
    }
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Não foi possível mover o caso.');
    } else {
      await fetchAll();
    }
    setDraggedId(null);
  };

  if (loading) {
    return (
      <div className="wrap">
        <p className="font-mono text-[var(--ink-soft)]">Carregando CRM...</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-teal)] shadow-[0_0_10px_var(--accent-teal)]" title="Mesa operacional conectada" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] font-display">
              CRM Restituição
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">{tenantName}</span>
            <span className="text-[var(--ink-muted)]">·</span>
            <span>{user?.name}</span>
            <span className="text-[var(--ink-muted)]">·</span>
            <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
              isAdmin
                ? 'bg-[var(--c-primeiro-bg)] text-[var(--c-primeiro)] border-[var(--c-primeiro)]'
                : 'bg-[var(--c-followup-bg)] text-[var(--c-followup)] border-[var(--c-followup)]'
            }`}>
              {isAdmin ? 'Administrador' : 'Operador'}
            </span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="view-switcher">
            <button className={`view-btn ${view === 'kanban' ? 'active' : ''}`} type="button" onClick={() => setView('kanban')}>
              <Columns3 className="w-3.5 h-3.5" /> Funil
            </button>
            <button className={`view-btn ${view === 'table' ? 'active' : ''}`} type="button" onClick={() => setView('table')}>
              <Table2 className="w-3.5 h-3.5" /> Lista
            </button>
            <button className={`view-btn ${view === 'agenda' ? 'active' : ''}`} type="button" onClick={() => setView('agenda')}>
              <CalendarDays className="w-3.5 h-3.5" /> Agenda
            </button>
            <button className={`view-btn ${view === 'dashboard' ? 'active' : ''}`} type="button" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="w-3.5 h-3.5" /> Números
            </button>
          </div>
          {isAdmin && (
            <button className="btn btn-ghost" type="button" onClick={() => setTeamOpen(true)}>
              <Users className="w-4 h-4" /> <span className="btn-label">Equipe</span>
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={toggleTheme} aria-label="Alternar tema" title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
            {dark ? <Sun className="w-4 h-4 text-[var(--c-semresp)]" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut className="w-4 h-4" /> <span className="btn-label">Sair</span>
          </button>
        </div>
      </div>

      <div className="search-row">
        <div className="search-box">
          <Search className="w-4 h-4 text-[var(--ink-soft)] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, CPF/CNPJ, telefone, apólice ou seguradora..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink)] px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>
        <button className="btn" type="button" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="filters-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {CASE_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.title}
            </option>
          ))}
        </select>
        <select value={listFilter} onChange={(e) => setListFilter(e.target.value)}>
          <option value="">Fila normal</option>
          <option value="retorno">Retorno pendente</option>
          <option value="nao-contatar">Não contatar</option>
        </select>
        <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
          <option value="">Qualquer data</option>
          <option value="today">Retorno hoje</option>
          <option value="overdue">Retorno atrasado</option>
        </select>
        <select value={insurerFilter} onChange={(e) => setInsurerFilter(e.target.value)}>
          <option value="">Todas as seguradoras</option>
          {insurers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos os tipos</option>
          {types.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={ufFilter}
          onChange={(e) => {
            setUfFilter(e.target.value);
            setCityFilter('');
          }}
        >
          <option value="">Todos os estados</option>
          {ufs.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="">Todas as cidades</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </div>

      {view === 'kanban' && (
        <KanbanBoard
          cardsByStatus={cardsByStatus}
          dragOverKey={dragOverKey}
          draggedId={draggedId}
          onDragStart={setDraggedId}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverKey(null);
          }}
          onDrop={moveCase}
          onDragOver={setDragOverKey}
          onOpen={openCard}
          onAdd={openNew}
        />
      )}
      {view === 'table' && <TableView clients={listClients} onOpen={openClient} />}
      {view === 'agenda' && <AgendaView clients={filteredClients} onOpen={openClient} />}
      {view === 'dashboard' && (
        <DashboardView
          clients={listClients}
          isAdmin={isAdmin}
          onOrphansClaimed={fetchAll}
        />
      )}

      {modalOpen && selected && (
        <ClientModal
          client={selected}
          isNew={isNew}
          currentUserName={user?.name || ''}
          onClose={() => setModalOpen(false)}
          onSaved={(saved) => {
            setIsNew(false);
            setSelected(saved);
            fetchAll();
          }}
          onDeleted={() => {
            setModalOpen(false);
            setSelected(null);
            fetchAll();
          }}
        />
      )}

      {teamOpen && (
        <TeamModal
          users={users}
          onClose={() => setTeamOpen(false)}
          onChanged={fetchAll}
        />
      )}

      <nav className="bottom-nav" aria-label="Navegação principal">
        <button type="button" className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
          <Columns3 className="w-5 h-5" />
          Funil
        </button>
        <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
          <Table2 className="w-5 h-5" />
          Lista
        </button>
        <button type="button" className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>
          <CalendarDays className="w-5 h-5" />
          Agenda
        </button>
        <button type="button" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          <LayoutDashboard className="w-5 h-5" />
          Números
        </button>
      </nav>
    </div>
  );
}
