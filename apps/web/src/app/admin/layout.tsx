import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string })?.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      <header className="backdrop-blur-md bg-[var(--card-glass)] border-b border-[var(--line-strong)] px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--paper-elevated)] border border-[var(--line-strong)] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L5 7v9c0 7.18 4.69 13.9 11 15 6.31-1.1 11-7.82 11-15V7L16 3z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--c-primeiro)]" />
              <path d="M12 16l3 3 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-lime)]" />
            </svg>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-[var(--ink)]">
              Mesa de Crédito
            </span>
            <span className="bg-[var(--c-followup-bg)] text-[var(--c-followup)] border border-[var(--c-followup)] text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm min-w-0">
          <a
            href="/app"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--line-glow)] hover:bg-[var(--card-subtle)] transition-all text-xs font-semibold"
          >
            Acessar CRM
          </a>
          <span className="font-mono text-xs text-[var(--ink-soft)] truncate max-w-[160px] sm:max-w-none border-l border-[var(--line-strong)] pl-3">
            {session.user?.email}
          </span>
          <a
            href="/api/auth/signout"
            className="px-3 py-1.5 rounded-lg border border-[var(--line-strong)] hover:border-[var(--line-glow)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card-subtle)] transition-all text-xs font-semibold"
          >
            Sair
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
