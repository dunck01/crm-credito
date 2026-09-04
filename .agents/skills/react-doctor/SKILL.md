---
name: react-doctor
description: >-
  Audits, diagnoses, and refactors React and Next.js components for best practices, component reuse, App Router architecture, accessibility, performance, and design tokens consistency. Use when asked to audit, diagnose, review, or run a doctor check on React/Next.js code or components.
---

# React & Next.js Doctor Skill

Esta skill atua como um médico cirurgião e arquiteto de front-end para aplicações React com Next.js 14 (App Router). Seu papel é diagnosticar anti-patterns, garantir reutilização máxima de componentes e design tokens, e assegurar conformidade com as melhores práticas de performance e acessibilidade.

---

## Procedimento de Diagnóstico (Runbook)

Quando ativado, execute as 5 etapas do checklist do Doctor:

### Etapa 1: Auditoria de Reutilização de Componentes (DRY)
1. Antes de sugerir criar qualquer novo componente ou elemento JSX, inspecione a base de componentes existentes em:
   - `apps/web/src/components/`
   - `apps/web/src/components/crm/`
2. Identifique se o novo caso de uso pode ser atendido por:
   - Modais existentes (`ClientModal`, `TeamModal`).
   - Botões padronizados (`.btn`, `.btn-primary`, `.btn-ghost`, `.btn-small`, `.wa-quick-btn`).
   - Badges e tags (`.segment-tag`, `.credit-code`, pills de status com `var(--stagecolor)`).
   - Containers e cartões (`.card`, `.kpi-card`, `.field`).
3. Se um bloco de código foi duplicado em 2 ou mais lugares, extraia-o para um componente compartilhado ou hook customizado.

### Etapa 2: Auditoria de Arquitetura Next.js 14 (App Router)
1. **Fronteira Servidor / Cliente:**
   - Verifique se `'use client'` está presente apenas onde estritamente necessário.
   - Páginas e layouts de rotas devem ser preferencialmente Server Components.
   - Componentes que apenas exibem dados estáticos ou realizam queries diretas não devem conter `'use client'`.
2. **Data Fetching e Tratamento de Erros:**
   - Verifique se chamadas de API tratam erros com `try/catch` e fornecem feedback ao usuário (banners de erro sem quebrar a árvore de renderização).
   - Assegure que estados de carregamento (`loading`) evitam layout shifts abruptos.

### Etapa 3: Auditoria de Estado e Ciclo de Vida React
1. **Anti-pattern de Sincronização de Estado via `useEffect`:**
   - Detectar e eliminar `useEffect` cujo único propósito é atualizar um `useState` derivado de outro estado ou prop.
   - Substituir por cálculo direto ou `useMemo(() => compute(prop), [prop])`.
2. **Dependências de Hooks:**
   - Checar se todos os hooks (`useEffect`, `useCallback`, `useMemo`) declaram suas dependências completas.
   - Nunca usar `// eslint-disable-next-line react-hooks/exhaustive-deps` sem justificativa arquitetural documentada.
3. **Limpeza de Recursos:**
   - Todo listener de eventos no `window` ou `document`, `setTimeout` ou `setInterval` dentro de `useEffect` deve conter função de limpeza (`return () => ...`).

### Etapa 4: Auditoria de Tokens de Design e Mobile-First
1. **Design Tokens vs. Cores Hardcoded:**
   - Garantir que **nenhum** componente utilize valores hexadecimais fixos inline ou classes Tailwind com cores estáticas de um único tema (como `text-sky-400` ou `bg-slate-800`).
   - Todas as cores devem vir de CSS variables do tema (`var(--ink)`, `var(--paper)`, `var(--card-glass)`, `var(--line)`, `var(--accent-lime)`, `var(--c-primeiro)`, `var(--danger)`).
   - O componente deve ser testado visualmente ou inspecionado mentalmente para funcionar tanto em dark mode quanto em light mode (`body.light-mode`).
2. **Mobile-First e Acessibilidade:**
   - Tamanho de fonte em inputs: mínimo de `16px` no mobile (`text-base sm:text-sm`) para prevenir auto-zoom no Safari iOS.
   - Touch targets: botões e links devem ter no mínimo `44px` de altura/largura útil de clique no mobile.
   - Overflow horizontal: nenhum elemento deve forçar o `body` a rolar horizontalmente.
   - Acessibilidade: botões de ícone único (sem texto visível) devem ter atributo `aria-label` ou `title`.

### Etapa 5: Validação Automatizada de Tipos (Quality Gate)
1. Execute o compilador do TypeScript no workspace web:
   ```bash
   npx tsc --noEmit --project apps/web/tsconfig.json
   ```
2. O resultado deve ter **0 erros**. Se houver erros de tipos (`any`, tipos faltantes, propriedades inexistentes), corrija-os imediatamente.

---

## Formato do Relatório do Doctor

Ao conduzir um diagnóstico, apresente o resultado com este formato claro:

```markdown
### 🩺 Diagnóstico do React Doctor: [Nome do Componente / Arquivo]

#### 1. Reutilização & Arquitetura
- [Status: ✅ Adequado | ⚠️ Oportunidade | ❌ Anti-pattern]
- Detalhes sobre componentes reutilizáveis, duplicidades e uso de Server vs Client.

#### 2. Estado & Hooks
- [Status: ✅ Otimizado | ⚠️ Alerta]
- Análise de `useEffect`, dependências e renderizações desnecessárias.

#### 3. Design Tokens & Mobile-First
- [Status: ✅ Conforme | ⚠️ Inconsistência]
- Checagem de tokens CSS, dark/light mode e alvos de toque mobile.

#### 4. Prescrição & Refatoração
- Código refatorado com diffs precisos e remoção dos pontos críticos.
```
