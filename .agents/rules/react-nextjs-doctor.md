# React & Next.js Doctor — Workspace Rules

Essas regras são ativas para todo o desenvolvimento no repositório `crm-credito` (especialmente `apps/web`).

## 1. Princípio de Reutilização Primeiro (DRY & Design System)
- **Pesquisar antes de criar:** Antes de criar qualquer novo elemento visual, consulte `apps/web/src/components/` e `apps/web/src/components/crm/` para identificar componentes existentes.
- **Reutilizar componentes existentes:**
  - Modais: use o padrão sheet/modal unificado (`ClientModal`, `TeamModal`).
  - Botões: utilize as classes do design system (`.btn`, `.btn-primary`, `.btn-ghost`, `.btn-small`, `.wa-quick-btn`).
  - Formulários: use a estrutura padronizada `.field` com labels monospace semânticos.
  - Badges e Pills: reutilize tags de segmento (`.segment-tag`, `.credit-code`) e pills de status operacionais com cores dinâmicas via `var(--stagecolor)`.
- **Não duplicar lógica de formatação:** Sempre utilize as funções utilitárias em `apps/web/src/lib/` (como `formatCpf`, `formatPhone`, `fmtMoney`, `fmtDateShort`).

## 2. Padrões de Next.js 14 (App Router)
- **Server Components por Padrão:** Páginas e layouts devem ser Server Components sempre que possível.
- **Isolamento de `'use client'`:**
  - Aplique `'use client'` apenas nos nós folha da árvore de componentes que exigem interatividade do navegador (hooks de estado, manipuladores de evento, APIs do navegador).
  - Nunca transforme um layout raiz ou página inteira em Client Component apenas para ter um botão interativo.
- **Data Fetching:**
  - Preserve as APIs e rotas de backend existentes (`/api/*`).
  - Trate estados de carregamento e erros de forma resiliente com feedbacks visuais claros para o operador.

## 3. Padrões de Estado e Hooks no React
- **Evitar Sincronização via `useEffect`:**
  - Calcule estados derivados diretamente no corpo do componente ou com `useMemo`. Não use `useEffect` para atualizar um estado local baseado em outro estado.
- **Dependências Estritas:**
  - Todo hook (`useEffect`, `useCallback`, `useMemo`) deve declarar todas as suas dependências reais sem suprimir o ESLint com comentários `eslint-disable`.
- **Limpeza de Eventos:**
  - Todo `addEventListener`, `setInterval` ou `setTimeout` dentro de um `useEffect` deve retornar a respectiva função de cleanup.

## 4. Design Tokens e Responsividade Mobile-First
- **Cores via Variáveis CSS (Zero Hexadecimais Fixos no JSX):**
  - Proibido inserir cores hexadecimais fixas ou classes como `text-sky-400`, `text-emerald-400` diretamente em componentes compartilhados.
  - Sempre use as variáveis semânticas do tema: `var(--ink)`, `var(--ink-soft)`, `var(--ink-muted)`, `var(--paper)`, `var(--card-glass)`, `var(--line)`, `var(--accent-lime)`, `var(--accent-teal)`, `var(--danger)`.
  - O tema claro (`body.light-mode`) e escuro (`:root` / `html.dark`) devem funcionar sem classes conflitantes.
- **Mobile-First Real:**
  - Desenhe primeiro para celulares (`<768px`, base 390px). Use media queries ou prefixos `sm:`, `md:`, `lg:` para expandir para desktop.
  - **Inputs:** `text-base sm:text-sm` (mínimo de 16px no mobile) para evitar o auto-zoom indesejado no iOS Safari.
  - **Touch Targets:** Botões e áreas interativas com altura mínima de 44px no mobile.
  - **Overflow Horizontal:** Proibido scroll horizontal no body. Apenas containers dedicados (`.board`, `.data-table`, `.admin-table-wrap`) podem rolar no eixo X.

## 5. Quality Gate Obrigatório
- Antes de finalizar qualquer alteração em componentes React/Next.js:
  1. Executar verificação de tipos: `npx tsc --noEmit` em `apps/web`.
  2. Garantir 0 erros de compilação ou linter.
  3. Validar se a alteração manteve compatibilidade tanto no tema escuro quanto no tema claro.
