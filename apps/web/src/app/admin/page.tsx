'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, UsersRound, Plus, ShieldCheck, CheckCircle2, AlertTriangle, Search } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED';
  plan: string;
  maxUsers: number;
  createdAt: string;
  _count: {
    clients: number;
    users: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export default function AdminDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'PRO',
    maxUsers: '10',
  });

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.ok) {
        setTenants(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar empresa.');
      } else {
        setIsModalOpen(false);
        setForm({
          name: '',
          slug: '',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          plan: 'PRO',
          maxUsers: '10',
        });
        fetchTenants();
      }
    } catch {
      setError('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, status: newStatus }),
      });
      if (res.ok) fetchTenants();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.users.some((u) => u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalClients = tenants.reduce((acc, t) => acc + (t._count?.clients || 0), 0);
  const totalUsers = tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0);
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 admin-header">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Gestão de Empresas & Multi-tenant
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-soft)] font-sans mt-0.5">
            Contas isoladas, limites operacionais e credenciais das mesas parceiras.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--accent-lime)] hover:opacity-90 text-[#070B14] font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(200,245,66,0.18)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Criar Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[var(--card-glass)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[var(--line-glow)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">Empresas</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--c-primeiro-bg)] border border-[var(--line-strong)] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[var(--c-primeiro)]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--ink)] mt-2">{tenants.length}</p>
          <p className="text-xs text-[var(--ink-soft)] mt-1 font-mono">
            <span className="text-[var(--accent-lime)] font-bold">{activeTenants}</span> ativas na rede
          </p>
        </div>

        <div className="bg-[var(--card-glass)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[var(--line-glow)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">Base de Titulares</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--c-recompra-bg)] border border-[var(--line-strong)] flex items-center justify-center">
              <UsersRound className="w-4 h-4 text-[var(--accent-lime)]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--accent-lime)] mt-2">{totalClients}</p>
          <p className="text-xs text-[var(--ink-soft)] mt-1 font-mono">CPFs em acompanhamento</p>
        </div>

        <div className="bg-[var(--card-glass)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[var(--line-glow)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">Operadores Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--c-followup-bg)] border border-[var(--line-strong)] flex items-center justify-center">
              <Users className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--accent-teal)] mt-2">{totalUsers}</p>
          <p className="text-xs text-[var(--ink-soft)] mt-1 font-mono">Contas em todas as mesas</p>
        </div>

        <div className="bg-[var(--card-glass)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[var(--line-glow)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">Segurança e Tenant</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--c-followup-bg)] border border-[var(--line-strong)] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
          </div>
          <p className="text-xs font-mono font-bold text-[var(--accent-teal)] mt-3.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-teal)]" /> Isolamento RLS Ativo
          </p>
          <p className="text-[11px] text-[var(--ink-soft)] mt-1 font-mono">Prisma schema v2</p>
        </div>
      </div>

      <div className="bg-[var(--card-glass)] border border-[var(--line-strong)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--line-strong)] flex flex-wrap items-center justify-between gap-3 bg-[var(--paper-elevated)]">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              placeholder="Buscar empresa, slug ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-xl text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-lime)] focus:outline-none transition-all"
            />
          </div>
          <span className="text-xs font-mono text-[var(--ink-soft)]">
            <span className="text-[var(--ink)] font-semibold">{filteredTenants.length}</span> empresas registradas
          </span>
        </div>

        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs sm:text-sm">
            <thead className="bg-[var(--paper-elevated)] font-mono text-[11px] text-[var(--ink-soft)] uppercase tracking-wider border-b border-[var(--line-strong)]">
              <tr>
                <th className="p-3.5 sm:p-4">Empresa / Mesa</th>
                <th className="p-3.5 sm:p-4">Plano</th>
                <th className="p-3.5 sm:p-4">Operadores</th>
                <th className="p-3.5 sm:p-4">Titulares</th>
                <th className="p-3.5 sm:p-4">Admin Principal</th>
                <th className="p-3.5 sm:p-4">Status</th>
                <th className="p-3.5 sm:p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--ink-soft)] font-mono text-xs">
                    Carregando empresas...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--ink-soft)] font-mono text-xs">
                    Nenhuma empresa encontrada para o filtro.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const adminUser = t.users.find((u) => u.role === 'TENANT_ADMIN') || t.users[0];
                  return (
                    <tr key={t.id} className="hover:bg-[var(--paper)] transition-colors">
                      <td className="p-3.5 sm:p-4 font-medium">
                        <div className="font-heading font-semibold text-[var(--ink)] text-sm sm:text-base">{t.name}</div>
                        <div className="text-[11px] font-mono text-[var(--ink-soft)] mt-0.5">slug: {t.slug}</div>
                      </td>
                      <td className="p-3.5 sm:p-4">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--c-primeiro-bg)] text-[var(--c-primeiro)] border border-[var(--c-primeiro)] text-[10px] font-mono font-bold tracking-wide">
                          {t.plan}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono text-xs tabular-nums text-[var(--ink)]">
                        {t._count?.users || 0} <span className="text-[var(--ink-soft)]">/ {t.maxUsers}</span>
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono text-xs font-bold tabular-nums text-[var(--accent-lime)]">
                        {t._count?.clients || 0}
                      </td>
                      <td className="p-3.5 sm:p-4 text-xs">
                        <div className="font-medium text-[var(--ink)]">{adminUser?.name || 'N/A'}</div>
                        <div className="text-[var(--ink-soft)] font-mono text-[11px]">{adminUser?.email || 'N/A'}</div>
                      </td>
                      <td className="p-3.5 sm:p-4">
                        {t.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--c-followup-bg)] text-[var(--c-followup)] border border-[var(--c-followup)] text-[11px] font-bold font-mono">
                            <CheckCircle2 className="w-3 h-3" /> ATIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)] text-[11px] font-bold font-mono">
                            <AlertTriangle className="w-3 h-3" /> SUSPENSA
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right">
                        <button
                          onClick={() => toggleStatus(t.id, t.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            t.status === 'ACTIVE'
                              ? 'border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-bg)]'
                              : 'border-[var(--c-followup)] text-[var(--c-followup)] hover:bg-[var(--c-followup-bg)]'
                          }`}
                        >
                          {t.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 bg-[var(--line-glow)] rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div>
                <h3 className="font-heading text-lg font-bold text-[var(--ink)]">Criar Nova Mesa / Empresa</h3>
                <p className="text-xs text-[var(--ink-soft)] font-mono">Cadastro de tenant isolado no sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs font-medium font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Nome da Empresa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Restituição Seguros"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                      setForm({ ...form, name, slug });
                    }}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-lime)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Slug Identificador</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm font-mono text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Plano de Acesso</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  >
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Limite de Operadores</label>
                  <input
                    type="number"
                    value={form.maxUsers}
                    onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm font-mono text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]">
                <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-[var(--accent-teal)] mb-2">Administrador Titular da Mesa</h4>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">E-mail Corporativo</label>
                  <input
                    type="email"
                    required
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] mb-1 font-semibold">Senha Provisória</label>
                  <input
                    type="password"
                    required
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-subtle)] border border-[var(--line-strong)] rounded-lg text-sm font-mono text-[var(--ink)] outline-none focus:border-[var(--accent-lime)] transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] text-xs font-semibold hover:bg-[var(--card-subtle)] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 sm:px-5 py-2 bg-[var(--accent-lime)] hover:opacity-90 text-[#070B14] font-semibold rounded-xl text-xs sm:text-sm disabled:opacity-50 transition-all shadow-[0_0_16px_rgba(200,245,66,0.15)] cursor-pointer"
                >
                  {saving ? 'Criando...' : 'Confirmar Criação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
