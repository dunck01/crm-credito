'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Shield, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Ocorreu um erro ao realizar o login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[var(--paper)] text-[var(--ink)] relative overflow-hidden">
      {/* Subtle institutional illumination - no huge orbs or AI gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-[var(--c-primeiro)]/[0.04] to-transparent pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-[#0D1527] to-[#070B14] border border-[var(--c-primeiro)]/25 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4L26 8V16C26 22.5 21.5 27 16 29C10.5 27 6 22.5 6 16V8L16 4Z" fill="#0D1527" stroke="#38BDF8" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M11 16L14.5 19.5L21 13" stroke="#C8F542" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="23" x2="20" y2="23" stroke="#2EE6A6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            CRM Restituição
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-1.5 font-medium">
            Restituição de crédito e seguros
          </p>
        </div>

        <div className="bg-[var(--card-glass)] backdrop-blur-xl border border-[var(--line-strong)] rounded-2xl p-6 sm:p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),var(--shadow-lg)]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2EE6A6] shadow-[0_0_8px_#2EE6A6]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
                Acesso Operacional
              </span>
            </div>
            <span className="text-[10.5px] font-mono text-[var(--ink-muted)]">v2026.1</span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                E-mail de acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--ink-soft)] pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@restituicao.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--paper-elevated)] border border-[var(--line-strong)] rounded-xl text-base sm:text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                Chave de segurança
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--ink-soft)] pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--paper-elevated)] border border-[var(--line-strong)] rounded-xl text-base sm:text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#C8F542] hover:bg-[#bbf028] text-[#070B14] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3 shadow-[0_4px_16px_rgba(200,245,66,0.25)] hover:shadow-[0_6px_22px_rgba(200,245,66,0.38)] cursor-pointer"
            >
              {loading ? 'Validando credenciais...' : 'Acessar Mesa de Operações'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2EE6A6]" /> Criptografia 256-bit
            </span>
            <span>Mesa de Crédito</span>
          </div>
        </div>
      </div>
    </div>
  );
}
